const OpenAI = require('openai');
const Groq = require('groq-sdk');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function safeJsonParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: e };
  }
}

function buildSchemaInstruction(shapeExample) {
  return `Respond ONLY with JSON (no markdown) matching this shape: ${shapeExample}`;
}

async function callOpenAIJson(prompt) {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You must output valid JSON only.',
      },
      { role: 'user', content: prompt },
    ],
  });

  const content = res?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI: empty response');

  const parsed = safeJsonParse(content);
  if (!parsed.ok) throw new Error('OpenAI: malformed JSON');
  return parsed.value;
}

async function callGroqJson(prompt) {
  const res = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: 'You must output valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    // groq-sdk supports response_format for JSON mode in many models
    response_format: { type: 'json_object' },
  });

  const content = res?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq: empty response');

  const parsed = safeJsonParse(content);
  if (!parsed.ok) throw new Error('Groq: malformed JSON');
  return parsed.value;
}

async function generateJsonWithFallback(prompt) {
  try {
    const value = await callOpenAIJson(prompt);
    return { llmStatus: 'success', llmProvider: 'openai', ...value };
  } catch (e1) {
    try {
      const value = await callGroqJson(prompt);
      return { llmStatus: 'success', llmProvider: 'groq', ...value };
    } catch {
      return { llmStatus: 'failed' };
    }
  }
}

exports.generatePreVisitSummary = async (symptoms) => {
  try {
    const prompt =
      `Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: ${symptoms}\n` +
      buildSchemaInstruction(
        '{ "urgencyLevel": "Low|Medium|High", "chiefComplaint": "string", "suggestedQuestions": ["q1","q2","q3"] }'
      );

    const out = await generateJsonWithFallback(prompt);
    if (out.llmStatus === 'failed') return out;

    const suggestedQuestions = Array.isArray(out.suggestedQuestions)
      ? out.suggestedQuestions.slice(0, 3)
      : [];

    return {
      llmStatus: 'success',
      llmProvider: out.llmProvider,
      urgencyLevel: out.urgencyLevel,
      chiefComplaint: out.chiefComplaint,
      suggestedQuestions,
    };
  } catch {
    return { llmStatus: 'failed' };
  }
};

exports.generatePostVisitSummary = async (clinicalNotes) => {
  try {
    const prompt =
      `Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: ${clinicalNotes}\n` +
      buildSchemaInstruction(
        '{ "patientFriendlySummary": "string", "followUpSteps": ["step1","step2"] }'
      );

    const out = await generateJsonWithFallback(prompt);
    if (out.llmStatus === 'failed') return out;

    return {
      llmStatus: 'success',
      llmProvider: out.llmProvider,
      patientFriendlySummary: out.patientFriendlySummary,
      followUpSteps: Array.isArray(out.followUpSteps) ? out.followUpSteps : [],
    };
  } catch {
    return { llmStatus: 'failed' };
  }
};

