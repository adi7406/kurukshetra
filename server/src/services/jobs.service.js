import { getSupabase } from '../integrations/supabase.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';

export const jobsService = {
  /**
   * Create an asynchronous job with optional idempotency key.
   */
  async createJob({ type, inputPayload = {}, idempotencyKey = null, userId, runnerFn = null }) {
    const supabase = getSupabase();

    // Check for idempotency reuse
    if (idempotencyKey) {
      const { data: allJobs = [] } = await supabase.from('jobs').select('*');
      const existing = (allJobs || []).find(
        (j) => j.idempotency_key === idempotencyKey && j.created_by === userId
      );

      if (existing) {
        // Check payload equality
        const existingInput = JSON.stringify(existing.input_payload || {});
        const currentInput = JSON.stringify(inputPayload || {});
        if (existingInput !== currentInput) {
          throw new ConflictError('Idempotency-Key reused with a different request payload.');
        }
        return existing;
      }
    }

    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        type,
        status: 'queued',
        progress: { completed: 0, total: 100 },
        input_payload: inputPayload,
        result: null,
        error: null,
        idempotency_key: idempotencyKey,
        created_by: userId,
      })
      .select()
      .single();

    if (error || !job) {
      throw new Error('Failed to create background job.');
    }

    // Launch execution asynchronously without blocking the caller
    if (runnerFn) {
      setImmediate(async () => {
        try {
          // Transition to running
          await supabase
            .from('jobs')
            .update({
              status: 'running',
              progress: { completed: 10, total: 100 },
            })
            .eq('id', job.id);

          const result = await runnerFn({
            jobId: job.id,
            updateProgress: async (completed, total = 100) => {
              await supabase
                .from('jobs')
                .update({ progress: { completed, total } })
                .eq('id', job.id);
            },
          });

          // Transition to succeeded
          await supabase
            .from('jobs')
            .update({
              status: 'succeeded',
              progress: { completed: 100, total: 100 },
              result: result || { success: true },
            })
            .eq('id', job.id);
        } catch (err) {
          // Transition to failed with safe message
          await supabase
            .from('jobs')
            .update({
              status: 'failed',
              error: {
                message: err.message || 'Job execution encountered a failure.',
                code: err.code || 'JOB_FAILED',
              },
            })
            .eq('id', job.id);
        }
      });
    }

    return job;
  },

  /**
   * Retrieve job status with access control.
   */
  async getJobById(jobId, userId, userRole) {
    const supabase = getSupabase();

    const { data: job } = await supabase.from('jobs').select('*').eq('id', jobId).maybeSingle();
    if (!job) {
      throw new NotFoundError('Job not found.');
    }

    const isPrivileged = userRole === 'admin' || userRole === 'trainer';
    if (!isPrivileged && job.created_by !== userId) {
      throw new ForbiddenError('You do not have permission to access this job.');
    }

    return {
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
    };
  },

  /**
   * Cancel an active queued or running job.
   */
  async cancelJob(jobId, userId, userRole) {
    const supabase = getSupabase();

    const { data: job } = await supabase.from('jobs').select('*').eq('id', jobId).maybeSingle();
    if (!job) {
      throw new NotFoundError('Job not found.');
    }

    if (job.created_by !== userId && userRole !== 'admin') {
      throw new ForbiddenError('You do not have permission to cancel this job.');
    }

    if (['succeeded', 'failed', 'cancelled'].includes(job.status)) {
      throw new ConflictError(`Cannot cancel a job that is already in terminal state '${job.status}'.`);
    }

    const { data: updated } = await supabase
      .from('jobs')
      .update({ status: 'cancelled' })
      .eq('id', jobId)
      .select()
      .single();

    return updated;
  },
};
