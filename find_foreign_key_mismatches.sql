-- Script to identify all foreign key columns that reference User.id but have incompatible types
-- This will help catch issues like the StreamSubscription.hostId problem

-- 1. Find all text columns that contain 'Id' in their name
-- (potential foreign keys that might need conversion to UUID)
SELECT
    table_name,
    column_name,
    data_type
FROM
    information_schema.columns
WHERE
    table_schema = 'public'
    AND data_type = 'text'
    AND (
        column_name LIKE '%Id' 
        OR column_name LIKE '%_id'
        OR column_name = 'id'
    )
ORDER BY
    table_name, column_name;

-- 2. Specifically look for columns with 'hostId' which is causing the issue
SELECT
    table_name,
    column_name,
    data_type
FROM
    information_schema.columns
WHERE
    table_schema = 'public'
    AND column_name = 'hostId'
ORDER BY
    table_name;

-- 3. Check foreign key constraints that might be referencing User.id
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
    AND ccu.table_name = 'User'
ORDER BY
    tc.table_name,
    kcu.column_name;

-- 4. Identify any foreign key constraints that reference User.id but have type mismatches
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
    AND c.data_type != fc.data_type
ORDER BY
    tc.table_name,
    kcu.column_name;

-- 5. Check for potential foreign key columns that don't have constraints yet
SELECT
    c.table_name,
    c.column_name,
    c.data_type
FROM
    information_schema.columns c
LEFT JOIN (
    SELECT
        tc.table_name,
        kcu.column_name
    FROM
        information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
    WHERE
        tc.constraint_type = 'FOREIGN KEY'
) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
WHERE
    c.table_schema = 'public'
    AND fk.column_name IS NULL
    AND (
        c.column_name LIKE '%Id'
        OR c.column_name LIKE '%_id'
    )
    AND c.table_name != 'User' -- Exclude the User table itself
ORDER BY
    c.table_name,
    c.column_name; 