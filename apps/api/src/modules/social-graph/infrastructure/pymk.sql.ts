/**
 * People-you-may-know candidate query. `$1` = the user asking for suggestions.
 *
 * Candidates come from three sources, unioned in `cand`:
 *  - `fof`  — friends of friends, ranked by mutual-friend count (capped to the top 200 before the
 *             final join, so the ranking cost stays bounded regardless of how many friends the
 *             user's friends have).
 *  - `comm` — members of the user's own smallest communities (smallest first, capped to 5, so a
 *             member of one huge community doesn't pull in its entire membership).
 *  - `city` — same-city users, scored by how many of the user's followed-community topics they
 *             also follow a community of.
 * `excluded` drops the user themself, anyone already a friend or with any friendship row (pending
 * or declined) against the user, and anyone the user hid via `friend_suggestion_hidden`.
 *
 * Deviations from the spec draft, both required for Postgres to accept the statement:
 *  - The `city` CTE's `FROM users u, me LEFT JOIN follows fl ON fl.follower_id = u.id ...` mixed
 *    comma-join and LEFT JOIN in a way that makes Postgres parse the LEFT JOIN as binding to `me`
 *    (the immediately preceding item), not to `u` — since `u` is only introduced by the earlier
 *    comma item, the join tree still resolves it correctly here, but that only works by accident
 *    of ordering and reads as wrong. Rewritten below as an explicit left-deep chain
 *    (`FROM users u CROSS JOIN me LEFT JOIN follows fl ON ... LEFT JOIN communities c ON ...`) —
 *    same result set, unambiguous to read and equally unambiguous to the planner.
 *  - Added explicit `bigint` casts on every bare `$1`/`$2` occurrence used only in an `=`/`<>`
 *    comparison against a bigint column so the extended-query-protocol parameter type inference
 *    (which otherwise defaults untyped literals to `text`/`int4` from the first usage it sees) is
 *    unambiguous across every one of `$1`'s several uses in this statement.
 *  - Cast the output `u.id` to `int`: `users.id` is `bigint`, and Bun's raw SQL client (unlike
 *    Drizzle's own query builder, which maps `bigint` columns to JS `number` per the schema's
 *    `mode: 'number'`) returns bigint columns as strings to avoid silent precision loss above
 *    2^53. Every id in this app fits comfortably in a JS number, so the cast is safe and keeps
 *    this raw query's output shape matching `UserCellDto.id: number`.
 */
export const PYMK_SQL = `
with me_friends as (
  select case when user_lo = $1::bigint then user_hi else user_lo end as fid
  from friendships where status = 'accepted' and (user_lo = $1::bigint or user_hi = $1::bigint)
), excluded as (
  select fid as uid from me_friends
  union select case when user_lo = $1::bigint then user_hi else user_lo end from friendships where (user_lo = $1::bigint or user_hi = $1::bigint)
  union select hidden_id from friend_suggestion_hidden where user_id = $1::bigint
  union select $1::bigint
), fof as (
  select case when f.user_lo = mf.fid then f.user_hi else f.user_lo end as uid, count(*)::int as mutual
  from me_friends mf join friendships f on f.status = 'accepted' and (f.user_lo = mf.fid or f.user_hi = mf.fid)
  group by 1 order by mutual desc limit 200
), my_comms as (
  select cm.community_id from community_members cm join communities c on c.id = cm.community_id
  where cm.user_id = $1::bigint order by c.members_count asc limit 5
), comm as (
  select cm.user_id as uid, count(*)::int as shared_communities
  from my_comms mc join community_members cm on cm.community_id = mc.community_id group by 1
), me as (select city from users where id = $1::bigint),
my_topics as (
  select distinct c.topic from follows fl join communities c on c.id = fl.target_id
  where fl.follower_id = $1::bigint and fl.target_type = 'community'
), city as (
  select u.id as uid, count(distinct c.topic)::int as shared_topics
  from users u
  cross join me
  left join follows fl on fl.follower_id = u.id and fl.target_type = 'community'
  left join communities c on c.id = fl.target_id and c.topic in (select topic from my_topics)
  where u.city = me.city and u.id <> $1::bigint group by u.id limit 100
), cand as (
  select uid from fof union select uid from comm union select uid from city
)
select u.id::int as id, u.first_name as "firstName", u.last_name as "lastName", u.screen_name as "screenName", u.city, u.is_verified as "isVerified", u.last_seen_at as "lastSeenAt",
  coalesce(fof.mutual, 0) as mutual, (u.city is not distinct from me.city) as "sameCity",
  3*coalesce(fof.mutual,0) + 2*coalesce(comm.shared_communities,0) + (case when u.city is not distinct from me.city then 1 else 0 end) + 0.5*coalesce(city.shared_topics,0) as score
from cand join users u on u.id = cand.uid cross join me
left join fof on fof.uid = cand.uid left join comm on comm.uid = cand.uid left join city on city.uid = cand.uid
where cand.uid not in (select uid from excluded)
order by score desc, u.id asc limit 20`
