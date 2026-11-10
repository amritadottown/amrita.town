export interface Member {
	name: string;
	website: string;
	branch: string;
	campus: string;
	batch: string;
	feeds?: string[];
}

export interface FeedPost {
	title: string;
	link: string;
	published: string;
	description?: string;
}

export type FeedFormat = "rss" | "atom";

export interface FeedSource {
	url: string;
	format: FeedFormat;
}

export interface MemberFeedCache {
	name: string;
	website: string;
	feeds?: FeedSource[];
	posts: FeedPost[];
}

export type FeedCache = Record<string, MemberFeedCache>;
