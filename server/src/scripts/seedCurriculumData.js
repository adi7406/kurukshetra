import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSupabase } from '../integrations/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const curriculumPath = path.resolve(__dirname, '../data/curriculum_syllabi.json');

/**
 * Idempotently seeds the 3 Core Curricula into Supabase:
 * 1. Object-Oriented Programming (Java)
 * 2. Data Structures & Algorithms (Python)
 * 3. Operating Systems (C)
 * 
 * Along with their prerequisite DAG, 45 MCQs, and 18 Coding Assessments.
 */
export async function seedCurriculum() {
  console.info('[Curriculum Seed] Loading curriculum dataset from:', curriculumPath);
  if (!fs.existsSync(curriculumPath)) {
    throw new Error(`Curriculum dataset not found at ${curriculumPath}`);
  }

  const raw = fs.readFileSync(curriculumPath, 'utf8');
  const curriculum = JSON.parse(raw);
  const supabase = getSupabase();

  console.info(`[Curriculum Seed] Processing ${curriculum.subjects.length} subjects...`);

  // System admin / trainer profile for ownership
  const systemTrainerId = '00000000-0000-0000-0000-000000000001';
  await supabase.from('profiles').upsert(
    {
      id: systemTrainerId,
      display_name: 'MasterPath Curriculum Lead',
      role: 'trainer',
      metadata: { department: 'Core Computer Science', verified: true },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  let totalConcepts = 0;
  let totalPrereqs = 0;
  let totalMcqs = 0;
  let totalCodingProblems = 0;

  for (const subject of curriculum.subjects) {
    console.info(`\n[Curriculum Seed] Seeding Subject: ${subject.title} (${subject.language})`);

    // 1. Create or update course
    const { data: courseData } = await supabase
      .from('courses')
      .upsert(
        {
          id: subject.id,
          title: subject.title,
          description: subject.description,
          created_by: systemTrainerId,
          status: 'published',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select()
      .maybeSingle();

    const courseId = courseData?.id || subject.id;

    // 2. Create course version
    const versionId = `v1-${subject.id}`;
    await supabase.from('course_versions').upsert(
      {
        id: versionId,
        course_id: courseId,
        version_number: 1,
        status: 'published',
        learning_audience: 'Computer Science Undergraduates & Practitioners',
        learning_goals: [`Master core principles of ${subject.title}`],
        created_by: systemTrainerId,
      },
      { onConflict: 'id' }
    );

    // 3. Create default module
    const moduleId = `mod-${subject.id}`;
    await supabase.from('modules').upsert(
      {
        id: moduleId,
        course_version_id: versionId,
        title: `${subject.title} Core Foundations`,
        description: `Foundational learning sequence for ${subject.title}`,
        order_index: 0,
      },
      { onConflict: 'id' }
    );

    // 4. Seed Topics as Concepts
    const topicConceptMap = new Map();

    for (let i = 0; i < subject.topics.length; i++) {
      const topic = subject.topics[i];
      const conceptId = topic.id;
      topicConceptMap.set(topic.id, conceptId);

      await supabase.from('concepts').upsert(
        {
          id: conceptId,
          module_id: moduleId,
          name: topic.name,
          description: topic.description,
          order_index: i,
          status: 'published',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      totalConcepts++;

      // Seed MCQs for this topic
      for (const mcq of topic.mcqs) {
        await supabase.from('questions').upsert(
          {
            id: mcq.id,
            course_id: courseId,
            concept_id: conceptId,
            type: 'objective',
            prompt: mcq.stem,
            options: mcq.options,
            correct_option_id: mcq.correctOptionId,
            explanation: mcq.explanation,
            status: 'published',
            bloom_level: mcq.bloomLevel,
            difficulty: mcq.difficulty,
            metadata: { topicId: topic.id, subjectId: subject.id },
            created_by: systemTrainerId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
        totalMcqs++;
      }

      // Seed Coding Assessments for this topic
      for (const coding of topic.codingAssessments) {
        await supabase.from('assessments').upsert(
          {
            id: coding.id,
            course_id: courseId,
            title: coding.title,
            description: coding.description,
            type: 'coding',
            time_limit_minutes: 45,
            passing_score: 70,
            status: 'published',
            created_by: systemTrainerId,
            metadata: {
              topicId: topic.id,
              conceptId,
              difficulty: coding.difficulty,
              starterCode: coding.starterCode,
              constraints: coding.constraints,
              vivaTopics: coding.vivaQuestions,
            },
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

        // Seed starter code stub
        await supabase.from('code_stubs').upsert(
          {
            id: `stub-${coding.id}`,
            assessment_id: coding.id,
            language: subject.language.toLowerCase().includes('java')
              ? 'java'
              : subject.language.toLowerCase().includes('python')
              ? 'python'
              : 'c',
            starter_code: coding.starterCode,
          },
          { onConflict: 'id' }
        );

        // Seed test cases (public + hidden)
        for (const testCase of coding.testCases) {
          await supabase.from('test_cases').upsert(
            {
              id: testCase.id,
              assessment_id: coding.id,
              input: testCase.input,
              expected_output: testCase.expectedOutput,
              is_hidden: Boolean(testCase.isHidden),
              explanation: testCase.explanation,
            },
            { onConflict: 'id' }
          );
        }

        totalCodingProblems++;
      }
    }

    // 5. Seed Prerequisites DAG (e.g. topic 2 requires topic 1, topic 3 requires topic 2)
    for (const topic of subject.topics) {
      if (topic.prerequisites && topic.prerequisites.length > 0) {
        for (const prereqTopicId of topic.prerequisites) {
          const targetConceptId = topic.id;
          const prereqConceptId = prereqTopicId;

          await supabase.from('concept_prerequisites').upsert(
            {
              concept_id: targetConceptId,
              prerequisite_concept_id: prereqConceptId,
              created_by: systemTrainerId,
            },
            { onConflict: 'concept_id,prerequisite_concept_id' }
          );
          totalPrereqs++;
        }
      }
    }
  }

  console.info('\n========================================');
  console.info('✔ CURRICULUM SEEDING COMPLETED SUCCESSFULLY:');
  console.info(`  • Subjects: ${curriculum.subjects.length} (OOP, DSA, OS)`);
  console.info(`  • Concepts / Topics: ${totalConcepts}`);
  console.info(`  • Prerequisite DAG Edges: ${totalPrereqs}`);
  console.info(`  • Standard Bloom MCQs: ${totalMcqs}`);
  console.info(`  • Monaco Coding Assessments: ${totalCodingProblems}`);
  console.info('========================================\n');

  return {
    success: true,
    subjects: curriculum.subjects.length,
    concepts: totalConcepts,
    prerequisites: totalPrereqs,
    mcqs: totalMcqs,
    codingProblems: totalCodingProblems,
  };
}

// CLI runner
if (process.argv[1] === __filename) {
  seedCurriculum()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Curriculum Seed] Error:', err);
      process.exit(1);
    });
}
