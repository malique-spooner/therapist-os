import { api } from '@/lib/api';

describe('api client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('sends the API key header on requests', async () => {
    await api.getDashboard('this-week');

    expect(global.fetch).toHaveBeenCalled();
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const headers = init?.headers as Headers;
    expect(headers.get('X-API-Key')).toBeTruthy();
  });

  it('calls the data source endpoints with the expected paths', async () => {
    await api.getDataSources();
    await api.connectDataSource('garmin');
    await api.syncDataSource('garmin');

    const calls = vi.mocked(global.fetch).mock.calls.map(([url]) => String(url));
    expect(calls).toContain('http://localhost:8000/api/data-sources');
    expect(calls).toContain('http://localhost:8000/api/data-sources/garmin/connect');
    expect(calls).toContain('http://localhost:8000/api/data-sources/garmin/sync');
  });

  it('sends transcription uploads as multipart form data', async () => {
    await api.transcribeAudio(new Blob(['voice'], { type: 'audio/webm' }));

    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBeInstanceOf(FormData);
    const headers = init?.headers as Headers;
    expect(headers.get('X-API-Key')).toBeTruthy();
  });

  it('calls the live session endpoint with POST', async () => {
    await api.createLiveSession();

    const [url, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(String(url)).toBe('http://localhost:8000/api/ai/live/session');
    expect(init?.method).toBe('POST');
  });
});
