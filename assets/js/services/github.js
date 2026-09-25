/**
 * Données publiques GitHub (profil + derniers commits du portfolio), mises en cache pour la session.
 */
import { session } from '../core/store.js';
import { profile } from '../data/profile.js';

const API = 'https://api.github.com';

async function cachedJson(key, url) {
    const cached = session.get(key);
    if (cached) return cached;
    const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) throw new Error(`GitHub ${response.status}`);
    const json = await response.json();
    session.set(key, json);
    return json;
}

export async function getGithubProfile() {
    try {
        const user = await cachedJson('gh-user', `${API}/users/${profile.handle}`);
        return {
            login: user.login,
            avatar: user.avatar_url,
            repos: user.public_repos,
            followers: user.followers,
            following: user.following,
            url: user.html_url,
        };
    } catch {
        return null;
    }
}

export async function getCommits(limit = 20) {
    try {
        const repo = profile.links.repo.replace('https://github.com/', '');
        const commits = await cachedJson('gh-commits', `${API}/repos/${repo}/commits?per_page=${limit}`);
        return commits.map((commit) => ({
            sha: commit.sha.slice(0, 7),
            message: commit.commit.message.split('\n')[0],
            author: commit.commit.author.name,
            date: new Date(commit.commit.author.date),
            url: commit.html_url,
        }));
    } catch {
        return [];
    }
}
