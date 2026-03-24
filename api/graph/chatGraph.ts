import { StateGraph, START, END } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { ChatStateAnnotation, type ChatState } from './state.js'
import { CHAT_SYSTEM_PROMPT, CHAT_CLASSIFY_INSTRUCTION, CHAT_ANSWER_INSTRUCTION, GUARDRAIL_MESSAGE } from '../prompts/chat.js'

// ── Shared context builder ────────────────────────────────────────────────────
function buildSystemMessage(reviewTexts: string[], instruction: string): string {
  const corpus = reviewTexts
    .map((text, i) => `[Review ${i + 1}]\n${text}`)
    .join('\n\n')
  return `${CHAT_SYSTEM_PROMPT}\n\nReviews corpus:\n${corpus}\n\n${instruction}`
}

// ── Node 1: classifyQuestion ──────────────────────────────────────────────────
async function classifyQuestion(state: ChatState): Promise<Partial<ChatState>> {
  const model = new ChatOpenAI({
    model: 'gpt-4.1-mini',
    temperature: 0,
    apiKey: process.env.OPENAI_API_KEY,
  })

  const response = await model.invoke([
    { role: 'system', content: buildSystemMessage(state.reviewTexts, CHAT_CLASSIFY_INSTRUCTION) },
    { role: 'user', content: state.question },
  ])

  const parsed = JSON.parse(response.content as string) as { answerable: boolean }
  return { isGuardrailed: !parsed.answerable }
}

// ── Node 2: answerQuestion ────────────────────────────────────────────────────
function createAnswerNode(onToken: (chunk: string) => void) {
  return async function answerQuestion(state: ChatState): Promise<Partial<ChatState>> {
    const model = new ChatOpenAI({
      model: 'gpt-4.1-mini',
      temperature: 0.4,
      streaming: true,
      apiKey: process.env.OPENAI_API_KEY,
    })

    const stream = await model.stream([
      { role: 'system', content: buildSystemMessage(state.reviewTexts, CHAT_ANSWER_INSTRUCTION) },
      { role: 'user', content: state.question },
    ])

    let answer = ''
    for await (const chunk of stream) {
      const token = (chunk.content as string) ?? ''
      if (token) {
        answer += token
        onToken(token)
      }
    }

    return { answer }
  }
}

// ── Node 3: guardrailResponse ─────────────────────────────────────────────────
function createGuardrailNode(onToken: (chunk: string) => void) {
  return function guardrailResponse(_state: ChatState): Partial<ChatState> {
    onToken(GUARDRAIL_MESSAGE)
    return { answer: GUARDRAIL_MESSAGE }
  }
}

// ── Conditional edge ──────────────────────────────────────────────────────────
function routeAfterClassify(state: ChatState): 'answerQuestion' | 'guardrailResponse' {
  return state.isGuardrailed ? 'guardrailResponse' : 'answerQuestion'
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function runChatGraph(
  question: string,
  reviewTexts: string[],
  onToken: (chunk: string) => void,
): Promise<{ answer: string; isGuardrailed: boolean }> {
  const graph = new StateGraph(ChatStateAnnotation)
    .addNode('classifyQuestion', classifyQuestion)
    .addNode('answerQuestion', createAnswerNode(onToken))
    .addNode('guardrailResponse', createGuardrailNode(onToken))
    .addEdge(START, 'classifyQuestion')
    .addConditionalEdges('classifyQuestion', routeAfterClassify)
    .addEdge('answerQuestion', END)
    .addEdge('guardrailResponse', END)
    .compile()

  const result = await graph.invoke({
    question,
    reviewTexts,
    isGuardrailed: false,
    answer: '',
  })

  return { answer: result.answer, isGuardrailed: result.isGuardrailed }
}
