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

  it('calls the brain endpoint with the expected path', async () => {
    await api.getBrain();

    const [url] = vi.mocked(global.fetch).mock.calls[0];
    expect(String(url)).toBe('http://localhost:8000/api/brain');
  });

  it('calls the data source endpoints with the expected paths', async () => {
    await api.getDataSources();
    await api.getDataSourceSetup('garmin');
    await api.saveDataSourceSetup('garmin', { email: 'athlete@example.com' });
    await api.beginDataSourceAuthorization('spotify');
    await api.completeDataSourceAuthorization('spotify', { code: 'abc', state: 'xyz' });
    await api.connectDataSource('garmin');
    await api.syncDataSource('garmin');

    const calls = vi.mocked(global.fetch).mock.calls.map(([url]) => String(url));
    expect(calls).toContain('http://localhost:8000/api/data-sources');
    expect(calls).toContain('http://localhost:8000/api/data-sources/garmin/setup');
    expect(calls).toContain('http://localhost:8000/api/data-sources/spotify/authorize');
    expect(calls).toContain('http://localhost:8000/api/data-sources/spotify/oauth/callback');
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

  it('calls app-open prompt and location companion endpoints with the expected paths', async () => {
    await api.getOpenPrompt();
    await api.dismissOpenPrompt('location_people_2026-03-31');
    await api.getLocationCompanions('2026-03-31');
    await api.saveLocationCompanions('2026-03-31', {
      personIds: ['alex'],
      contextLabel: 'Social outing',
      note: 'Dinner after work',
    });

    const calls = vi.mocked(global.fetch).mock.calls.map(([url]) => String(url));
    expect(calls).toContain('http://localhost:8000/api/open-prompts/current');
    expect(calls).toContain('http://localhost:8000/api/open-prompts/location_people_2026-03-31/dismiss');
    expect(calls).toContain('http://localhost:8000/api/location/companions?date=2026-03-31');
  });

  it('uploads snapchat best-friends screenshot imports as multipart form data', async () => {
    await api.importSnapchatBestFriendsScreenshot({
      file: new File(['image'], 'best-friends.png', { type: 'image/png' }),
      capturedAt: '2026-04-02T08:30:00',
      matchedPersonIds: ['alex'],
      detectedLabels: ['Alex'],
      note: 'Morning check',
    });

    const [url, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(String(url)).toBe('http://localhost:8000/api/relationships/imports/snapchat');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBeInstanceOf(FormData);
  });
});
