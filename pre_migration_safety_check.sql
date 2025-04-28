-- Pre-migration safety checks to identify potential issues

-- 1. Check for non-UUID values in User.id that won't convert cleanly
SELECT id, name, email
FROM "User"
WHERE id !~* '^[0-9a-fA-F-]{36}$'
LIMIT 10;

-- 2. Check for non-UUID values in all foreign key columns referencing User.id
-- Account
SELECT "userId", "providerAccountId" 
FROM "Account" 
WHERE "userId" IS NOT NULL AND "userId" !~* '^[0-9a-fA-F-]{36}$'
LIMIT 10;

-- Comment
SELECT "userId", "content" 
FROM "Comment" 
WHERE "userId" IS NOT NULL AND "userId" !~* '^[0-9a-fA-F-]{36}$'
LIMIT 10;

-- Review
SELECT "userId", "content" 
FROM "Review" 
WHERE "userId" IS NOT NULL AND "userId" !~* '^[0-9a-fA-F-]{36}$'
LIMIT 10;

-- Follows
SELECT "followerId", "followingId"
FROM "Follows"
WHERE ("followerId" IS NOT NULL AND "followerId" !~* '^[0-9a-fA-F-]{36}$')
   OR ("followingId" IS NOT NULL AND "followingId" !~* '^[0-9a-fA-F-]{36}$')
LIMIT 10;

-- Session
SELECT "userId", "sessionToken"
FROM "Session"
WHERE "userId" IS NOT NULL AND "userId" !~* '^[0-9a-fA-F-]{36}$'
LIMIT 10;

-- Stream
SELECT "hostId", "title"
FROM "Stream"
WHERE "hostId" IS NOT NULL AND "hostId" !~* '^[0-9a-fA-F-]{36}$'
LIMIT 10;

-- StreamLike
SELECT "userId", id
FROM "StreamLike"
WHERE "userId" IS NOT NULL AND "userId" !~* '^[0-9a-fA-F-]{36}$'
LIMIT 10;

-- StreamReport
SELECT "userId", id
FROM "StreamReport"
WHERE "userId" IS NOT NULL AND "userId" !~* '^[0-9a-fA-F-]{36}$'
LIMIT 10;

-- StreamSubscription
SELECT "userId", "hostId", id
FROM "StreamSubscription"
WHERE ("userId" IS NOT NULL AND "userId" !~* '^[0-9a-fA-F-]{36}$')
   OR ("hostId" IS NOT NULL AND "hostId" !~* '^[0-9a-fA-F-]{36}$')
LIMIT 10;

-- StreamTip
SELECT "senderId", "hostId", id
FROM "StreamTip"
WHERE ("senderId" IS NOT NULL AND "senderId" !~* '^[0-9a-fA-F-]{36}$')
   OR ("hostId" IS NOT NULL AND "hostId" !~* '^[0-9a-fA-F-]{36}$')
LIMIT 10;

-- StreamView
SELECT "userId", id
FROM "StreamView"
WHERE "userId" IS NOT NULL AND "userId" !~* '^[0-9a-fA-F-]{36}$'
LIMIT 10;

-- Spirit
SELECT "ownerId", "id"
FROM "Spirit"
WHERE "ownerId" IS NOT NULL AND "ownerId" !~* '^[0-9a-fA-F-]{36}$'
LIMIT 10;

-- Video
SELECT "userId", "title"
FROM "Video"
WHERE "userId" IS NOT NULL AND "userId" !~* '^[0-9a-fA-F-]{36}$'
LIMIT 10;

-- 3. Check for nullable constraints on all foreign key columns
-- This will show not-null constraints that could cause problems if data is nullified
SELECT 
    table_name, 
    column_name, 
    is_nullable 
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' AND 
    column_name IN (
        'userId', 'followerId', 'followingId', 'hostId', 'senderId', 'ownerId'
    ) AND
    is_nullable = 'NO'
ORDER BY 
    table_name, 
    column_name;

-- 4. Check for any existing foreign key constraints with type mismatches
SELECT
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    c.data_type AS column_type,
    fc.data_type AS foreign_column_type
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    JOIN information_schema.columns AS c
        ON c.table_schema = tc.table_schema
        AND c.table_name = tc.table_name
        AND c.column_name = kcu.column_name
    JOIN information_schema.columns AS fc
        ON fc.table_schema = tc.table_schema
        AND fc.table_name = ccu.table_name
        AND fc.column_name = ccu.column_name
WHERE 
    tc.constraint_type = 'FOREIGN KEY'
    AND c.data_type != fc.data_type;

-- 5. Check if all expected foreign key constraints exist
WITH expected_constraints (constraint_name) AS (
  VALUES 
    ('Account_userId_fkey'),
    ('Comment_userId_fkey'),
    ('Review_userId_fkey'),
    ('Follows_followerId_fkey'),
    ('Follows_followingId_fkey'),
    ('Session_userId_fkey'),
    ('Stream_hostId_fkey'),
    ('StreamLike_userId_fkey'),
    ('StreamReport_userId_fkey'),
    ('StreamSubscription_userId_fkey'),
    ('StreamSubscription_hostId_fkey'),
    ('StreamTip_senderId_fkey'),
    ('StreamTip_hostId_fkey'),
    ('StreamView_userId_fkey'),
    ('Spirit_ownerId_fkey'),
    ('Video_userId_fkey')
)
SELECT 
    e.constraint_name as expected_constraint,
    tc.constraint_name as existing_constraint
FROM 
    expected_constraints e
LEFT JOIN 
    information_schema.table_constraints tc
    ON tc.constraint_name = e.constraint_name
    AND tc.constraint_type = 'FOREIGN KEY'
WHERE 
    tc.constraint_name IS NULL
ORDER BY 
    e.constraint_name;

-- 6. Count records in each table that might be affected
SELECT 'User' as table_name, COUNT(*) as record_count FROM "User"
UNION ALL
SELECT 'Account', COUNT(*) FROM "Account"
UNION ALL
SELECT 'Comment', COUNT(*) FROM "Comment"
UNION ALL
SELECT 'Review', COUNT(*) FROM "Review"
UNION ALL
SELECT 'Follows', COUNT(*) FROM "Follows"
UNION ALL
SELECT 'Session', COUNT(*) FROM "Session"
UNION ALL
SELECT 'Stream', COUNT(*) FROM "Stream"
UNION ALL
SELECT 'StreamLike', COUNT(*) FROM "StreamLike"
UNION ALL
SELECT 'StreamReport', COUNT(*) FROM "StreamReport"
UNION ALL
SELECT 'StreamSubscription', COUNT(*) FROM "StreamSubscription"
UNION ALL
SELECT 'StreamTip', COUNT(*) FROM "StreamTip"
UNION ALL
SELECT 'StreamView', COUNT(*) FROM "StreamView"
UNION ALL
SELECT 'Spirit', COUNT(*) FROM "Spirit"
UNION ALL
SELECT 'Video', COUNT(*) FROM "Video"
ORDER BY table_name; 