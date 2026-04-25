/**
 * GitHub API integration for discovering real developer candidates.
 * Searches GitHub users by skills/languages and extracts profile data.
 */

export interface GitHubCandidate {
  id: string;
  name: string;
  title: string;
  skills: string[];
  experience_years: number;
  location: string;
  bio: string;
  avatar_url: string;
  avatar_color: string;
  availability: 'open' | 'actively_looking' | 'passive';
  github_url: string;
  repos_count: number;
  followers: number;
  top_repos: { name: string; language: string; stars: number; url: string }[];
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
];

const HEADERS: Record<string, string> = {
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

function getHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    return { ...HEADERS, 'Authorization': `Bearer ${token}` };
  }
  return HEADERS;
}

// Map common GitHub languages to skill names
const LANGUAGE_MAP: Record<string, string> = {
  'JavaScript': 'JavaScript', 'TypeScript': 'TypeScript', 'Python': 'Python',
  'Java': 'Java', 'Go': 'Go', 'Rust': 'Rust', 'Ruby': 'Ruby',
  'C++': 'C++', 'C#': 'C#', 'PHP': 'PHP', 'Swift': 'Swift',
  'Kotlin': 'Kotlin', 'Dart': 'Dart', 'Shell': 'Bash', 'HCL': 'Terraform',
  'Dockerfile': 'Docker', 'HTML': 'HTML', 'CSS': 'CSS', 'SCSS': 'CSS',
  'Vue': 'Vue.js', 'Svelte': 'Svelte',
};

// Infer frameworks from repo names/descriptions
function inferSkillsFromRepo(name: string, description: string | null): string[] {
  const text = `${name} ${description || ''}`.toLowerCase();
  const skills: string[] = [];
  const patterns: [string, string][] = [
    ['react', 'React'], ['next', 'Next.js'], ['vue', 'Vue.js'],
    ['angular', 'Angular'], ['svelte', 'Svelte'], ['express', 'Express'],
    ['fastapi', 'FastAPI'], ['django', 'Django'], ['flask', 'Flask'],
    ['spring', 'Spring Boot'], ['graphql', 'GraphQL'], ['postgres', 'PostgreSQL'],
    ['mongodb', 'MongoDB'], ['redis', 'Redis'], ['docker', 'Docker'],
    ['kubernetes', 'Kubernetes'], ['k8s', 'Kubernetes'], ['terraform', 'Terraform'],
    ['aws', 'AWS'], ['gcp', 'GCP'], ['azure', 'Azure'],
    ['node', 'Node.js'], ['deno', 'Deno'], ['tailwind', 'Tailwind'],
    ['prisma', 'Prisma'], ['pytorch', 'PyTorch'], ['tensorflow', 'TensorFlow'],
    ['langchain', 'LangChain'], ['openai', 'LLMs'], ['llm', 'LLMs'],
    ['machine-learning', 'Machine Learning'], ['deep-learning', 'Deep Learning'],
    ['ci-cd', 'CI/CD'], ['github-actions', 'CI/CD'],
  ];
  for (const [pattern, skill] of patterns) {
    if (text.includes(pattern) && !skills.includes(skill)) {
      skills.push(skill);
    }
  }
  return skills;
}

// Estimate experience from account age and activity
function estimateExperience(createdAt: string, publicRepos: number, followers: number): number {
  const years = (Date.now() - new Date(createdAt).getTime()) / (365.25 * 24 * 3600 * 1000);
  const baseYears = Math.floor(years);
  // Adjust based on activity - more repos/followers suggest more experience
  const activityBonus = publicRepos > 50 ? 2 : publicRepos > 20 ? 1 : 0;
  return Math.min(Math.max(baseYears + activityBonus, 1), 15);
}

// Infer availability from bio and recent activity
function inferAvailability(bio: string | null, hireable: boolean | null): 'open' | 'actively_looking' | 'passive' {
  if (hireable) return 'actively_looking';
  const bioLower = (bio || '').toLowerCase();
  if (bioLower.includes('looking') || bioLower.includes('open to') || bioLower.includes('available') || bioLower.includes('hire me')) {
    return 'actively_looking';
  }
  if (bioLower.includes('freelance') || bioLower.includes('contractor') || bioLower.includes('consultant')) {
    return 'open';
  }
  return 'passive';
}

/**
 * Search GitHub for developers matching the given skills.
 */
export async function searchGitHubCandidates(
  skills: string[],
  location: string | null,
  minExperience: number,
  maxResults: number = 20
): Promise<GitHubCandidate[]> {
  // Build search query from skills → programming languages only
  const SEARCH_LANGUAGES = ['JavaScript','TypeScript','Python','Java','Go','Rust','Ruby','C++','C#','PHP','Swift','Kotlin','Dart','Vue','Svelte'];
  const languageQueries = skills
    .map(s => {
      const lang = Object.entries(LANGUAGE_MAP).find(([, v]) => v.toLowerCase() === s.toLowerCase());
      return lang && SEARCH_LANGUAGES.includes(lang[0]) ? `language:${lang[0]}` : null;
    })
    .filter(Boolean);

  // Construct query — use ONE language (GitHub ANDs multiple language qualifiers)
  let query = '';
  if (languageQueries.length > 0) {
    query = languageQueries[0]!; // Use primary language only
  } else {
    // Fallback: search by skill name as keyword
    query = skills[0] || 'developer';
  }

  // Add location if specified and not remote
  if (location && !['remote', 'anywhere', 'flexible'].includes(location.toLowerCase())) {
    query += ` location:${location.split(',')[0].trim()}`;
  }

  // Require some minimum activity
  const followersMin = minExperience > 5 ? 5 : 1;
  query += ` followers:>${followersMin} repos:>5`;

  console.log(`GitHub search query: ${query}`);

  try {
    const searchRes = await fetch(
      `https://api.github.com/search/users?q=${encodeURIComponent(query)}&sort=followers&order=desc&per_page=${Math.min(maxResults + 10, 50)}`,
      { headers: getHeaders() }
    );

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      console.error(`GitHub search failed (${searchRes.status}):`, errText);
      throw new Error(`GitHub API error: ${searchRes.status}`);
    }

    const searchData = await searchRes.json();
    const users = searchData.items || [];

    if (users.length === 0) {
      console.log('No GitHub users found, trying broader search...');
      // Fallback: broader search with just the top skill
      const fallbackQuery = `${skills[0] || 'developer'} followers:>2 repos:>3`;
      const fallbackRes = await fetch(
        `https://api.github.com/search/users?q=${encodeURIComponent(fallbackQuery)}&sort=followers&order=desc&per_page=${maxResults}`,
        { headers: getHeaders() }
      );
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        users.push(...(fallbackData.items || []));
      }
    }

    // Fetch detailed profiles (in batches to respect rate limits)
    const candidates: GitHubCandidate[] = [];
    const batchSize = 5;

    for (let i = 0; i < Math.min(users.length, maxResults); i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      const profiles = await Promise.all(
        batch.map(async (user: { login: string }, idx: number) => {
          try {
            // Fetch user profile
            const profileRes = await fetch(`https://api.github.com/users/${user.login}`, { headers: getHeaders() });
            if (!profileRes.ok) return null;
            const profile = await profileRes.json();

            // Fetch repos to extract languages/skills
            const reposRes = await fetch(
              `https://api.github.com/users/${user.login}/repos?sort=updated&per_page=15&type=owner`,
              { headers: getHeaders() }
            );
            const repos = reposRes.ok ? await reposRes.json() : [];

            // Extract skills from repos
            const repoSkills = new Set<string>();
            const topRepos: { name: string; language: string; stars: number; url: string }[] = [];

            for (const repo of repos) {
              if (repo.fork) continue;
              // Add language
              if (repo.language && LANGUAGE_MAP[repo.language]) {
                repoSkills.add(LANGUAGE_MAP[repo.language]);
              }
              // Infer framework skills from repo name/description
              const inferred = inferSkillsFromRepo(repo.name, repo.description);
              inferred.forEach((s: string) => repoSkills.add(s));

              if (topRepos.length < 5 && repo.stargazers_count > 0) {
                topRepos.push({
                  name: repo.name,
                  language: repo.language || 'Unknown',
                  stars: repo.stargazers_count,
                  url: repo.html_url,
                });
              }
            }

            // Sort top repos by stars
            topRepos.sort((a, b) => b.stars - a.stars);

            const experience = estimateExperience(profile.created_at, profile.public_repos, profile.followers);
            const availability = inferAvailability(profile.bio, profile.hireable);

            // Generate a title from skills
            const primaryLangs = Array.from(repoSkills).slice(0, 2);
            let title = 'Software Developer';
            if (primaryLangs.includes('React') || primaryLangs.includes('Vue.js') || primaryLangs.includes('Angular')) {
              title = experience > 6 ? 'Senior Frontend Engineer' : 'Frontend Developer';
            } else if (primaryLangs.includes('Python') && (repoSkills.has('Machine Learning') || repoSkills.has('PyTorch'))) {
              title = experience > 5 ? 'Senior ML Engineer' : 'Data Scientist';
            } else if (primaryLangs.includes('Go') || primaryLangs.includes('Rust')) {
              title = experience > 5 ? 'Senior Backend Engineer' : 'Backend Developer';
            } else if (repoSkills.has('Docker') || repoSkills.has('Kubernetes') || repoSkills.has('Terraform')) {
              title = experience > 5 ? 'Senior DevOps Engineer' : 'DevOps Engineer';
            } else if (repoSkills.size >= 4) {
              title = experience > 6 ? 'Senior Full Stack Engineer' : 'Full Stack Developer';
            }

            return {
              id: `gh-${profile.login}`,
              name: profile.name || profile.login,
              title,
              skills: Array.from(repoSkills).slice(0, 10),
              experience_years: experience,
              location: profile.location || 'Remote',
              bio: profile.bio || `${profile.public_repos} public repos, ${profile.followers} followers on GitHub.`,
              avatar_url: profile.avatar_url,
              avatar_color: COLORS[(i + idx) % COLORS.length],
              availability,
              github_url: profile.html_url,
              repos_count: profile.public_repos,
              followers: profile.followers,
              top_repos: topRepos,
            } as GitHubCandidate;
          } catch (err) {
            console.error(`Failed to fetch profile for ${user.login}:`, err);
            return null;
          }
        })
      );

      candidates.push(...profiles.filter((p): p is GitHubCandidate => p !== null));

      // Small delay between batches to be respectful of rate limits
      if (i + batchSize < users.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    console.log(`Found ${candidates.length} GitHub candidates`);
    return candidates;
  } catch (error) {
    console.error('GitHub search error:', error);
    throw error;
  }
}
