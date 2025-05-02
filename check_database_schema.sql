-- Comprehensive Database Schema Inspector

-- List all tables in the public schema
SELECT 
    table_name,
    table_type
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
ORDER BY 
    table_name;

-- List all columns for each table in the public schema
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.column_default,
    c.is_nullable,
    c.is_identity,
    c.identity_generation
FROM 
    information_schema.tables t
JOIN 
    information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
WHERE 
    t.table_schema = 'public'
ORDER BY 
    t.table_name,
    c.ordinal_position;

-- List primary keys
SELECT
    tc.table_schema, 
    tc.table_name, 
    kc.column_name 
FROM 
    information_schema.table_constraints tc
JOIN 
    information_schema.key_column_usage kc ON kc.constraint_name = tc.constraint_name
WHERE 
    tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
ORDER BY 
    tc.table_schema,
    tc.table_name;

-- List foreign keys
SELECT
    tc.table_schema, 
    tc.table_name AS table_with_foreign_key, 
    kc.column_name AS foreign_key_column, 
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column
FROM 
    information_schema.table_constraints tc
JOIN 
    information_schema.key_column_usage kc ON tc.constraint_name = kc.constraint_name
JOIN 
    information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE 
    tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY 
    tc.table_schema,
    tc.table_name;

-- List indexes
SELECT
    tablename,
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    schemaname = 'public'
ORDER BY
    tablename,
    indexname;

-- List RLS policies
SELECT
    n.nspname AS schema_name,
    c.relname AS table_name,
    pol.polname AS policy_name,
    CASE
        WHEN pol.polpermissive THEN 'PERMISSIVE'
        ELSE 'RESTRICTIVE'
    END AS permissive,
    CASE
        WHEN pol.polroles = '{0}' THEN 'PUBLIC'
        ELSE array_to_string(array(SELECT rolname FROM pg_roles WHERE oid = ANY(pol.polroles)), ', ')
    END AS roles,
    CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END AS command,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM
    pg_policy pol
JOIN
    pg_class c ON pol.polrelid = c.oid
JOIN
    pg_namespace n ON c.relnamespace = n.oid
WHERE
    n.nspname = 'public'
ORDER BY
    schema_name, table_name, policy_name;

-- Look specifically at the Video table columns
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    column_default,
    is_nullable,
    is_identity
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
    AND table_name = 'Video'
ORDER BY 
    ordinal_position;

-- Get the exact case of all table names (useful for identifying casing issues)
SELECT 
    relname AS exact_table_name,
    n.nspname AS schema_name
FROM 
    pg_class c
JOIN 
    pg_namespace n ON n.oid = c.relnamespace
WHERE 
    c.relkind = 'r' 
    AND n.nspname = 'public'
ORDER BY 
    relname; 