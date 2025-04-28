-- Verify User.id is now UUID
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'User' AND column_name = 'id';

-- Verify all foreign key columns referencing User.id are also UUID
SELECT 
    tc.table_name, 
    kcu.column_name,
    c.data_type
FROM 
    information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    JOIN information_schema.columns c
        ON c.table_schema = tc.table_schema
        AND c.table_name = tc.table_name
        AND c.column_name = kcu.column_name
WHERE 
    tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'User'
    AND ccu.column_name = 'id';

-- Check for any foreign key constraints with mismatched types
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

-- Verify foreign key constraints exist for all expected references to User.id
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND constraint_name IN (
    'Account_userId_fkey',
    'Comment_userId_fkey',
    'Review_userId_fkey',
    'Follows_followerId_fkey',
    'Follows_followingId_fkey',
    'Session_userId_fkey',
    'Stream_hostId_fkey',
    'StreamLike_userId_fkey',
    'StreamReport_userId_fkey',
    'StreamSubscription_userId_fkey',
    'StreamSubscription_hostId_fkey',
    'StreamTip_senderId_fkey',
    'StreamTip_hostId_fkey',
    'StreamView_userId_fkey',
    'Spirit_ownerId_fkey',
    'Video_userId_fkey'
  )
ORDER BY table_name, constraint_name; 