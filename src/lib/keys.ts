const e = encodeURIComponent;

/** Every Redis key the app uses lives here. See README "Redis data model". */
export const K = {
  user: (uid: string) => `user:${uid}`,
  userEmail: (email: string) => `user:email:${email}`,
  vocab: (id: string) => `vocab:${id}`,
  // per-user indexes over vocabulary
  vocabIndex: (uid: string) => `user:${uid}:vocabulary`, // ZSET id -> createdAt
  alpha: (uid: string) => `user:${uid}:vocab:alpha`, // ZSET id -> alphabetical score
  practiceIdx: (uid: string) => `user:${uid}:vocab:practice`, // ZSET id -> practiceCount
  recentIdx: (uid: string) => `user:${uid}:vocab:recent`, // ZSET id -> lastPracticedAt
  newIdx: (uid: string) => `user:${uid}:vocab:new`, // SET never practiced
  hardIdx: (uid: string) => `user:${uid}:vocab:hard`, // ZSET id -> struggle score
  masteredIdx: (uid: string) => `user:${uid}:vocab:mastered`, // SET
  reviewQueue: (uid: string) => `user:${uid}:review-queue`, // ZSET id -> nextReviewAt
  normMap: (uid: string) => `user:${uid}:vocab:norm`, // HASH normalized english -> id
  tokens: (uid: string) => `user:${uid}:vocab:tokens`, // ZSET (score 0) "token|id"
  tagIdx: (uid: string, tag: string) => `user:${uid}:tag:${e(tag)}`, // SET
  tagCounts: (uid: string) => `user:${uid}:tags`, // HASH tag -> count
  diffIdx: (uid: string, d: string) => `user:${uid}:difficulty:${d}`, // SET
  // collections
  collection: (id: string) => `collection:${id}`,
  collections: (uid: string) => `user:${uid}:collections`, // ZSET id -> createdAt
  collectionNames: (uid: string) => `user:${uid}:collection-names`, // HASH normalized name -> id
  collectionItems: (uid: string, cid: string) => `user:${uid}:collection:${cid}:items`, // SET
  // practice + stats
  stats: (uid: string) => `user:${uid}:stats`,
  daily: (uid: string) => `user:${uid}:daily`, // HASH YYYY-MM-DD -> attempts
  dailyCorrect: (uid: string) => `user:${uid}:daily-correct`,
  practicedOn: (uid: string, day: string) => `user:${uid}:practiced:${day}`, // SET of ids
  history: (uid: string) => `user:${uid}:practice-history`, // LIST (capped)
  // shared / infra
  translation: (provider: string, pair: string, hash: string) => `translation:${provider}:${pair}:${hash}`,
  idem: (uid: string, requestId: string) => `idempotency:${uid}:${requestId}`,
  rate: (scope: string, id: string) => `ratelimit:${scope}:${id}`,
  tmp: (uid: string, nonce: string) => `tmp:${uid}:${nonce}`,
};
