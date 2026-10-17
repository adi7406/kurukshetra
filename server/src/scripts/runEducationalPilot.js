import dotenv from 'dotenv';
dotenv.config();

import { aiProvider, NVIDIA_CONFIG } from '../integrations/aiProvider.js';
import { PROMPT_REGISTRY } from '../utils/prompts.js';
import {
  generatedContentSchema,
  generatedQuestionsArraySchema,
} from '../utils/aiSchemas.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PILOT_SPEC = {
  subject: 'Object-Oriented Programming',
  topic: 'Classes and Objects',
  language: 'Java',
  count: 3,
};

async function testModelPilot(modelName) {
  console.log(`\n======================================================`);
  console.log(`   PILOT VERIFICATION: ${modelName}`);
  console.log(`======================================================`);

  const modelReport = {
    model: modelName,
    concept: { success: false, latencyMs: 0, validated: null, error: null },
    mcqs: { success: false, latencyMs: 0, validated: null, error: null },
  };

  // 1. Concept Explanation Generation
  console.log(`\n[Task 1/2] Generating Concept Explanation: ${PILOT_SPEC.topic} (${PILOT_SPEC.language})...`);
  const conceptPrompt = PROMPT_REGISTRY.CONTENT_GEN.buildPrompt({
    title: `${PILOT_SPEC.topic} in ${PILOT_SPEC.language}`,
    conceptName: PILOT_SPEC.topic,
    difficulty: 'intermediate',
    focusTopic: `${PILOT_SPEC.subject} - State encapsulation, instantiation, reference vs heap allocation`,
    language: PILOT_SPEC.language,
  });

  const t0 = Date.now();
  try {
    const conceptOutput = await aiProvider.generateStructuredOutput({
      systemPrompt: conceptPrompt.systemPrompt,
      userPrompt: conceptPrompt.userPrompt,
      schema: generatedContentSchema,
      model: modelName,
      allowFallback: false,
      timeoutMs: 45000,
      maxRetries: 3,
    });

    const elapsed = Date.now() - t0;
    modelReport.concept.success = true;
    modelReport.concept.latencyMs = elapsed;
    modelReport.concept.validated = conceptOutput;

    console.log(`✓ Concept generation SUCCEEDED in ${elapsed}ms`);
    console.log(`  Title:         "${conceptOutput.title}"`);
    console.log(`  Summary:       ${conceptOutput.summary.substring(0, 120)}...`);
    console.log(`  Sections:      ${conceptOutput.sections.map((s) => s.heading).join(' | ')}`);
    console.log(`  KeyTakeaways:  ${conceptOutput.keyTakeaways?.length || 0} items`);
    console.log(`  Schema Check:  PASSED (Zod validated)`);
  } catch (err) {
    const elapsed = Date.now() - t0;
    modelReport.concept.success = false;
    modelReport.concept.latencyMs = elapsed;
    modelReport.concept.error = err.message;
    console.error(`✗ Concept generation FAILED in ${elapsed}ms:`, err.message);
  }

  // 2. Three Single-Answer MCQs Generation
  console.log(`\n[Task 2/2] Generating 3 Single-Answer MCQs: ${PILOT_SPEC.topic}...`);
  const questionPrompt = PROMPT_REGISTRY.QUESTION_GEN.buildPrompt({
    topic: PILOT_SPEC.topic,
    conceptName: `${PILOT_SPEC.topic} (${PILOT_SPEC.language})`,
    difficulty: 'intermediate',
    count: PILOT_SPEC.count,
  });

  const t1 = Date.now();
  try {
    const questionOutput = await aiProvider.generateStructuredOutput({
      systemPrompt: questionPrompt.systemPrompt,
      userPrompt: questionPrompt.userPrompt,
      schema: generatedQuestionsArraySchema,
      model: modelName,
      allowFallback: false,
      timeoutMs: 45000,
      maxRetries: 3,
    });

    const elapsed = Date.now() - t1;
    modelReport.mcqs.success = true;
    modelReport.mcqs.latencyMs = elapsed;
    modelReport.mcqs.validated = questionOutput;

    console.log(`✓ MCQ generation SUCCEEDED in ${elapsed}ms`);
    console.log(`  Count:         ${questionOutput.questions.length} questions returned`);
    questionOutput.questions.forEach((q, i) => {
      console.log(`  Q${i + 1}: ${q.stem.substring(0, 75)}...`);
      console.log(`      Options (${q.options.length}): ${q.options.map((o) => `${o.id}: ${o.text}`).join(' | ')}`);
      console.log(`      Answer: ${q.correctOptionIds?.join(', ')}`);
    });
    console.log(`  Schema Check:  PASSED (Zod validated, unique option IDs, correct key bounds)`);
  } catch (err) {
    const elapsed = Date.now() - t1;
    modelReport.mcqs.success = false;
    modelReport.mcqs.latencyMs = elapsed;
    modelReport.mcqs.error = err.message;
    console.error(`✗ MCQ generation FAILED in ${elapsed}ms:`, err.message);
  }

  return modelReport;
}

async function runPilot() {
  console.log('======================================================');
  console.log('   MasterPath: Educational AI Generation Pilot');
  console.log('   Subject:  Object-Oriented Programming');
  console.log('   Topic:    Classes and Objects (Java)');
  console.log('======================================================');

  const models = [
    NVIDIA_CONFIG.SECONDARY_MODEL, // Run secondary (gpt-oss-20b) first
    NVIDIA_CONFIG.PRIMARY_MODEL,   // Run primary (nemotron) second
  ];

  const overallResults = {};

  for (const model of models) {
    overallResults[model] = await testModelPilot(model);
  }

  // Persist pilot report to diagnostic artifacts
  const outPath = path.join(__dirname, 'pilot_results.json');
  fs.writeFileSync(outPath, JSON.stringify(overallResults, null, 2));
  console.log(`\n======================================================`);
  console.log(`Pilot results saved to: ${outPath}`);
  console.log('======================================================');
}

runPilot().catch((err) => {
  console.error('[Pilot Aborted]:', err);
  process.exit(1);
});
