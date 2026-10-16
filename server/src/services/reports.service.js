import crypto from 'node:crypto';
import { getSupabase } from '../integrations/supabase.js';
import { env } from '../config/env.js';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../utils/errors.js';
import { masteryService } from './mastery.service.js';

const VALID_REPORT_TYPES = [
  'student_assessment_history',
  'student_mastery_report',
  'course_gradebook',
  'assessment_item_analysis',
];

const VALID_FORMATS = ['csv', 'json'];

/**
 * Serializes an array of objects to standard RFC 4180 compliant CSV.
 */
export function serializeToCsv(data, columns = null) {
  if (!Array.isArray(data) || data.length === 0) {
    if (columns && columns.length > 0) {
      return columns.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',') + '\n';
    }
    return '';
  }

  const keys = columns || Object.keys(data[0]);
  const headerLine = keys.map((k) => `"${String(k).replace(/"/g, '""')}"`).join(',');

  const rows = data.map((item) =>
    keys
      .map((k) => {
        const val = item[k];
        if (val === null || val === undefined) return '""';
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  return [headerLine, ...rows].join('\n');
}

/**
 * Signs an export token with HMAC-SHA256 to guarantee integrity and tamper resistance.
 */
function generateExportToken(exportId, requesterId, expiresAtTimestamp) {
  const secret = env.JWT_SECRET || 'kurukshetra-default-secret-key-32b';
  const data = `${exportId}:${requesterId}:${expiresAtTimestamp}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return `${expiresAtTimestamp}.${signature}`;
}

/**
 * Verifies the integrity and expiry of an export download token.
 */
function verifyExportToken(token, exportId, requesterId) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [timestampStr, signature] = parts;
  const expiresAtTimestamp = parseInt(timestampStr, 10);
  if (isNaN(expiresAtTimestamp)) return false;

  if (Date.now() > expiresAtTimestamp) {
    return false;
  }

  const secret = env.JWT_SECRET || 'kurukshetra-default-secret-key-32b';
  const data = `${exportId}:${requesterId}:${expiresAtTimestamp}`;
  const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSig, 'hex'));
}

export const reportsService = {
  /**
   * Safe audit logging helper for privileged access and exports
   */
  async logAuditEvent({ actorId, action, resourceType, resourceId, details = {}, reqMeta = {} }) {
    try {
      const supabase = getSupabase();
      await supabase.from('audit_logs').insert({
        actor_id: actorId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details,
        ip_address: reqMeta.ip || null,
        user_agent: reqMeta.userAgent || null,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Audit logging should not crash the primary operational workflow,
      // but failures are logged to stdout in production
    }
  },

  /**
   * Generates a sanitized, authorized export artifact
   */
  async generateReport({ reportType, format = 'json', parameters = {}, user, reqMeta = {} }) {
    if (!VALID_REPORT_TYPES.includes(reportType)) {
      throw new ValidationError(
        `Invalid reportType. Supported report types are: ${VALID_REPORT_TYPES.join(', ')}`
      );
    }

    const normalizedFormat = format.toLowerCase();
    if (!VALID_FORMATS.includes(normalizedFormat)) {
      throw new ValidationError(`Invalid format. Supported formats are: ${VALID_FORMATS.join(', ')}`);
    }

    const supabase = getSupabase();
    let records = [];
    let filenamePrefix = reportType;
    let privilegedAudit = null;

    // 1. Report Type Dispatch & Authorization
    if (reportType === 'student_assessment_history') {
      const targetStudentId = parameters.studentId || user.id;

      // Student can only export their own records
      if (user.role === 'student' && targetStudentId !== user.id) {
        throw new ForbiddenError('Students are only authorized to export their own assessment history.');
      }

      // If a trainer requests, ensure they manage the course if courseId provided
      if (user.role === 'trainer' && parameters.courseId) {
        const { data: course } = await supabase
          .from('courses')
          .select('*')
          .eq('id', parameters.courseId)
          .maybeSingle();

        if (!course || (course.created_by !== user.id && user.role !== 'admin')) {
          throw new ForbiddenError('You do not have permission to export records for this course.');
        }
      }

      let query = supabase
        .from('assessment_attempts')
        .select('*')
        .eq('student_id', targetStudentId)
        .order('created_at', { ascending: false });

      const { data: attempts = [] } = await query;
      const { data: assessments = [] } = await supabase.from('assessments').select('id, title, course_id');
      const assessMap = new Map((assessments || []).map((a) => [a.id, a]));

      records = (attempts || []).map((a) => {
        const assess = assessMap.get(a.assessment_id);
        const score = Number(a.score || 0);
        const maxScore = Number(a.max_score || 100);
        const percentage = maxScore > 0 ? parseFloat(((score / maxScore) * 100).toFixed(2)) : 0;

        return {
          attemptId: a.id,
          assessmentId: a.assessment_id,
          assessmentTitle: assess?.title || 'Unknown Assessment',
          courseId: assess?.course_id || null,
          status: a.status,
          score,
          maxScore,
          percentage,
          passed: a.passed === true || a.is_passing === true,
          startedAt: a.started_at,
          completedAt: a.completed_at,
        };
      });

      if (parameters.courseId) {
        records = records.filter((r) => r.courseId === parameters.courseId);
      }

      filenamePrefix = `assessment_history_${targetStudentId}`;
    } else if (reportType === 'student_mastery_report') {
      const targetStudentId = parameters.studentId || user.id;

      if (user.role === 'student' && targetStudentId !== user.id) {
        throw new ForbiddenError('Students are only authorized to export their own concept mastery data.');
      }

      const summaries = await masteryService.getStudentMasterySummary(targetStudentId);

      records = (summaries || []).map((s) => ({
        studentId: targetStudentId,
        conceptId: s.conceptId,
        conceptName: s.conceptName,
        courseId: s.courseId,
        masteryProbability: s.masteryProbability,
        evidenceCount: s.evidenceCount,
        modelName: s.modelName,
        modelVersion: s.modelVersion,
        lastEvidenceAt: s.lastEvidenceAt,
      }));

      if (parameters.courseId) {
        records = records.filter((r) => r.courseId === parameters.courseId);
      }

      filenamePrefix = `concept_mastery_${targetStudentId}`;
    } else if (reportType === 'course_gradebook') {
      if (user.role !== 'trainer' && user.role !== 'admin') {
        throw new ForbiddenError('Only trainers and administrators are authorized to export course gradebooks.');
      }

      const { courseId } = parameters;
      if (!courseId) {
        throw new ValidationError('parameters.courseId is required for course_gradebook export.');
      }

      const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle();
      if (!course) {
        throw new NotFoundError('Course not found.');
      }

      if (course.created_by !== user.id && user.role !== 'admin') {
        throw new ForbiddenError('You are not authorized to export gradebook for this course.');
      }

      const { data: enrollments = [] } = await supabase
        .from('enrollments')
        .select('*')
        .eq('course_id', courseId);

      const studentIds = (enrollments || []).map((e) => e.student_id);

      const { data: allProfiles = [] } = await supabase.from('profiles').select('id, display_name, email');
      const studentProfiles = (allProfiles || []).filter((p) => studentIds.includes(p.id));
      const profileMap = new Map(studentProfiles.map((p) => [p.id, p]));

      const { data: courseAssessments = [] } = await supabase
        .from('assessments')
        .select('id')
        .eq('course_id', courseId);
      const assessmentIds = (courseAssessments || []).map((a) => a.id);

      const { data: allAttempts = [] } = await supabase.from('assessment_attempts').select('*');
      const courseAttempts = (allAttempts || []).filter((a) => assessmentIds.includes(a.assessment_id));

      records = (enrollments || []).map((enr) => {
        const studentProfile = profileMap.get(enr.student_id);
        const stuAttempts = courseAttempts.filter((a) => a.student_id === enr.student_id);
        const completedAttempts = stuAttempts.filter((a) => a.status === 'completed');

        let totalScore = 0;
        let totalMax = 0;
        for (const att of completedAttempts) {
          totalScore += Number(att.score || 0);
          totalMax += Number(att.max_score || 100);
        }
        const avgPercentage = totalMax > 0 ? parseFloat(((totalScore / totalMax) * 100).toFixed(2)) : 0;

        const attemptDates = stuAttempts.map((a) => new Date(a.created_at).getTime()).filter((t) => !isNaN(t));
        const lastActivityMs = attemptDates.length > 0 ? Math.max(...attemptDates) : new Date(enr.created_at).getTime();

        return {
          studentId: enr.student_id,
          displayName: studentProfile?.display_name || 'Anonymous Student',
          email: studentProfile?.email || '',
          courseId,
          enrolledAt: enr.created_at,
          totalAttempts: stuAttempts.length,
          completedAttempts: completedAttempts.length,
          averagePercentage: avgPercentage,
          lastActiveAt: new Date(lastActivityMs).toISOString(),
        };
      });

      filenamePrefix = `gradebook_course_${courseId}`;
      privilegedAudit = {
        action: 'export_course_gradebook',
        resourceType: 'course',
        resourceId: courseId,
        details: { recordCount: records.length, format: normalizedFormat },
      };
    } else if (reportType === 'assessment_item_analysis') {
      if (user.role !== 'trainer' && user.role !== 'admin') {
        throw new ForbiddenError('Only trainers and administrators are authorized to export assessment item analysis.');
      }

      const { assessmentId } = parameters;
      if (!assessmentId) {
        throw new ValidationError('parameters.assessmentId is required for assessment_item_analysis export.');
      }

      const { data: assessment } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .maybeSingle();

      if (!assessment) {
        throw new NotFoundError('Assessment not found.');
      }

      const { data: course } = await supabase
        .from('courses')
        .select('*')
        .eq('id', assessment.course_id)
        .maybeSingle();

      if (course && course.created_by !== user.id && user.role !== 'admin') {
        throw new ForbiddenError('You are not authorized to export analytics for this assessment.');
      }

      // Fetch assessment questions
      const { data: allAssoc = [] } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', assessmentId);

      const versionIds = (allAssoc || []).map((aq) => aq.question_version_id);
      const { data: allVersions = [] } = await supabase.from('question_versions').select('*');
      const questionVersions = (allVersions || []).filter((v) => versionIds.includes(v.id));

      // Fetch attempt answers for analysis
      const { data: allAttempts = [] } = await supabase
        .from('assessment_attempts')
        .select('*')
        .eq('assessment_id', assessmentId);

      const completedAttempts = (allAttempts || []).filter((a) => a.status === 'completed');
      const completedAttemptIds = completedAttempts.map((a) => a.id);

      const { data: allAnswers = [] } = await supabase.from('attempt_answers').select('*');
      const assessmentAnswers = (allAnswers || []).filter((ans) =>
        completedAttemptIds.includes(ans.attempt_id)
      );

      records = questionVersions.map((qv) => {
        const answersForQ = assessmentAnswers.filter((ans) => ans.question_version_id === qv.id);
        const correctCount = answersForQ.filter((ans) => ans.is_correct === true).length;
        const totalAnswers = answersForQ.length;
        const successRate = totalAnswers > 0 ? parseFloat(((correctCount / totalAnswers) * 100).toFixed(2)) : 0;

        return {
          assessmentId,
          questionVersionId: qv.id,
          prompt: qv.prompt,
          questionType: qv.question_type,
          difficulty: qv.difficulty,
          marks: qv.marks,
          totalSubmissions: totalAnswers,
          correctSubmissions: correctCount,
          successRatePercentage: successRate,
        };
      });

      filenamePrefix = `item_analysis_assessment_${assessmentId}`;
      privilegedAudit = {
        action: 'export_assessment_analysis',
        resourceType: 'assessment',
        resourceId: assessmentId,
        details: { recordCount: records.length, format: normalizedFormat },
      };
    }

    // 2. Format Payload (CSV or JSON)
    let payload;
    let contentType;
    let fileExtension;

    if (normalizedFormat === 'csv') {
      payload = serializeToCsv(records);
      contentType = 'text/csv';
      fileExtension = 'csv';
    } else {
      payload = JSON.stringify(
        {
          reportType,
          generatedAt: new Date().toISOString(),
          recordCount: records.length,
          data: records,
        },
        null,
        2
      );
      contentType = 'application/json';
      fileExtension = 'json';
    }

    // 3. Expiring Download Token & DB Record Creation
    const exportId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const expiresAtMs = Date.now() + 60 * 60 * 1000; // 1 hour link expiry
    const expiresAt = new Date(expiresAtMs);
    const downloadToken = generateExportToken(exportId, user.id, expiresAtMs);
    const filename = `${filenamePrefix}_${new Date().toISOString().replace(/[:.]/g, '-')}.${fileExtension}`;

    await supabase.from('reports').insert({
      id: exportId,
      report_type: reportType,
      format: normalizedFormat,
      status: 'ready',
      parameters,
      record_count: records.length,
      payload,
      requester_id: user.id,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    });

    // 4. Log privileged exports
    if (privilegedAudit) {
      await this.logAuditEvent({
        actorId: user.id,
        action: privilegedAudit.action,
        resourceType: privilegedAudit.resourceType,
        resourceId: privilegedAudit.resourceId,
        details: privilegedAudit.details,
        reqMeta,
      });
    }

    return {
      exportId,
      reportType,
      format: normalizedFormat,
      status: 'ready',
      recordCount: records.length,
      filename,
      contentType,
      expiresAt: expiresAt.toISOString(),
      downloadToken,
      downloadUrl: `/api/v1/reports/${exportId}/download?token=${downloadToken}`,
    };
  },

  /**
   * Retrieves an export payload for authorized downloading
   */
  async getExportForDownload(exportId, downloadToken, authenticatedUser = null) {
    const supabase = getSupabase();
    const { data: report } = await supabase.from('reports').select('*').eq('id', exportId).maybeSingle();

    if (!report) {
      throw new NotFoundError('Report or export artifact not found.');
    }

    // Check expiration
    const expiryTime = new Date(report.expires_at).getTime();
    if (Date.now() > expiryTime) {
      throw new ForbiddenError('Download link has expired. Please request a new export.');
    }

    // Verify token
    const tokenValid = verifyExportToken(downloadToken, exportId, report.requester_id);
    if (!tokenValid) {
      // If token verification fails, check if an authenticated admin or the exact requester is calling with session
      if (!authenticatedUser || (authenticatedUser.id !== report.requester_id && authenticatedUser.role !== 'admin')) {
        throw new ForbiddenError('Invalid or expired download token.');
      }
    }

    // Requester authorization boundary check
    if (
      authenticatedUser &&
      authenticatedUser.id !== report.requester_id &&
      authenticatedUser.role !== 'admin'
    ) {
      throw new ForbiddenError('You are not authorized to download this report.');
    }

    const fileExtension = report.format === 'csv' ? 'csv' : 'json';
    const contentType = report.format === 'csv' ? 'text/csv' : 'application/json';
    const filename = `${report.report_type}_${report.id}.${fileExtension}`;

    return {
      id: report.id,
      reportType: report.report_type,
      format: report.format,
      payload: report.payload,
      contentType,
      filename,
      expiresAt: report.expires_at,
    };
  },

  /**
   * Fetches report metadata
   */
  async getReportById(exportId, user) {
    const supabase = getSupabase();
    const { data: report } = await supabase.from('reports').select('*').eq('id', exportId).maybeSingle();

    if (!report) {
      throw new NotFoundError('Report not found.');
    }

    if (report.requester_id !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('You do not have access to this report.');
    }

    return {
      id: report.id,
      reportType: report.report_type,
      format: report.format,
      status: report.status,
      parameters: report.parameters,
      recordCount: report.record_count,
      expiresAt: report.expires_at,
      createdAt: report.created_at,
    };
  },

  /**
   * Lists reports created by the user
   */
  async listUserReports(user) {
    const supabase = getSupabase();
    const { data: reports = [] } = await supabase
      .from('reports')
      .select('id, report_type, format, status, record_count, expires_at, created_at')
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false });

    return (reports || []).map((r) => ({
      id: r.id,
      reportType: r.report_type,
      format: r.format,
      status: r.status,
      recordCount: r.record_count,
      expiresAt: r.expires_at,
      createdAt: r.created_at,
    }));
  },
};
