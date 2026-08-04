import { describe, it, expect, vi, beforeEach } from 'vitest'

const getSessionMock = vi.fn()

vi.mock('../src/lib/supabaseClient', () => ({
  supabase: { auth: { getSession: getSessionMock } },
}))

const { gradeAndClaimReward } = await import('../src/lib/gradeAndClaimReward.js')

describe('gradeAndClaimReward', () => {
  beforeEach(() => {
    getSessionMock.mockReset()
    vi.stubGlobal('fetch', vi.fn())
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.test')
  })

  it('throws if there is no active session, without calling fetch', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } })

    await expect(
      gradeAndClaimReward({ sessionId: 's1', messages: [{ role: 'user', content: 'hi' }] })
    ).rejects.toThrow('Not signed in')

    expect(fetch).not.toHaveBeenCalled()
  })

  it('sends the bearer token and payload, and returns the parsed result on success', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'test-token' } } })
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ claimed: true, minutesAwarded: 14, feedback: 'Nice work.' }),
    })

    const result = await gradeAndClaimReward({
      sessionId: 's1',
      messages: [{ role: 'user', content: 'hi' }],
      subjectName: 'Economics',
      topicName: 'Markets',
      subtopicName: 'Supply and demand',
    })

    expect(result).toEqual({ claimed: true, minutesAwarded: 14, feedback: 'Nice work.' })

    const [url, options] = fetch.mock.calls[0]
    expect(url).toContain('/functions/v1/grade-tutor-session')
    expect(options.headers.Authorization).toBe('Bearer test-token')
    expect(JSON.parse(options.body)).toEqual({
      sessionId: 's1',
      messages: [{ role: 'user', content: 'hi' }],
      subjectName: 'Economics',
      topicName: 'Markets',
      subtopicName: 'Supply and demand',
    })
  })

  it('throws when the grading request fails', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'test-token' } } })
    fetch.mockResolvedValue({ ok: false })

    await expect(
      gradeAndClaimReward({ sessionId: 's1', messages: [{ role: 'user', content: 'hi' }] })
    ).rejects.toThrow('Grading request failed')
  })
})
