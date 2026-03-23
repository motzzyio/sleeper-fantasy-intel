const sleeperFetch = async (path: string) => {
  const res = await fetch(`/api/sleeper?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error(`Sleeper fetch failed: ${res.status} for ${path}`);
  return res.json();
};

export const api = {
  getNFLState: () => sleeperFetch("/state/nfl"),
  getUser: (username: string) => sleeperFetch(`/user/${username}`),
  getLeagues: (userId: string, season: string) =>
    sleeperFetch(`/user/${userId}/leagues/nfl/${season}`),
  getLeague: (id: string) => sleeperFetch(`/league/${id}`),
  getRosters: (id: string) => sleeperFetch(`/league/${id}/rosters`),
  getUsers: (id: string) => sleeperFetch(`/league/${id}/users`),
  getDrafts: (id: string) => sleeperFetch(`/league/${id}/drafts`),
  getDraftPicks: (draftId: string) => sleeperFetch(`/draft/${draftId}/picks`),
  getMatchups: (id: string, week: number) =>
    sleeperFetch(`/league/${id}/matchups/${week}`),
  getTransactions: (id: string, week: number) =>
    sleeperFetch(`/league/${id}/transactions/${week}`),
  getTrending: () =>
    sleeperFetch("/players/nfl/trending/add?lookback_hours=24&limit=25"),
};

export const askAI = async (system: string, prompt: string): Promise<string> => {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, prompt }),
  });
  if (!res.ok) throw new Error("AI request failed");
  const data = await res.json();
  return data.text ?? "";
};
