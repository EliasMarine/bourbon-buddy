-- Comprehensive Database Schema Enumeration
-- Shows all tables and their columns, constraints, indexes, and sample data in one place

WITH 
-- Get all tables with their rows count
table_counts AS (
    SELECT
        c.oid AS table_oid,
        c.relname AS table_name,
        pg_catalog.pg_total_relation_size(c.oid) / 1024 / 1024 AS size_mb,
        COALESCE(pg_catalog.obj_description(c.oid, 'pg_class'), '') AS table_description,
        (SELECT reltuples::bigint FROM pg_class WHERE oid = c.oid) AS approx_row_count
    FROM
        pg_catalog.pg_class c
    LEFT JOIN
        pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE
        c.relkind = 'r'
        AND n.nspname = 'public'
    ORDER BY
        c.relname
),

-- Get column details for each table
column_details AS (
    SELECT
        tc.table_name,
        c.ordinal_position,
        c.column_name,
        c.data_type,
        CASE 
            WHEN c.character_maximum_length IS NOT NULL THEN c.data_type || '(' || c.character_maximum_length || ')'
            WHEN c.data_type = 'numeric' AND c.numeric_precision IS NOT NULL AND c.numeric_scale IS NOT NULL
                THEN c.data_type || '(' || c.numeric_precision || ',' || c.numeric_scale || ')'
            ELSE c.data_type
        END AS full_data_type,
        c.column_default,
        c.is_nullable,
        COALESCE(pg_catalog.col_description(format('%I.%I', c.table_schema, c.table_name)::regclass::oid, c.ordinal_position), '') AS column_description,
        CASE WHEN pk.column_name IS NOT NULL THEN 'PRIMARY KEY' ELSE '' END AS is_primary_key,
        CASE WHEN uq.column_name IS NOT NULL THEN 'UNIQUE' ELSE '' END AS is_unique
    FROM
        information_schema.columns c
    JOIN
        table_counts tc ON c.table_name = tc.table_name
    LEFT JOIN (
        SELECT 
            tc.table_schema, 
            tc.table_name, 
            kcu.column_name
        FROM 
            information_schema.table_constraints tc
        JOIN 
            information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
        WHERE 
            tc.constraint_type = 'PRIMARY KEY'
    ) pk ON c.table_schema = pk.table_schema AND c.table_name = pk.table_name AND c.column_name = pk.column_name
    LEFT JOIN (
        SELECT 
            tc.table_schema, 
            tc.table_name, 
            kcu.column_name
        FROM 
            information_schema.table_constraints tc
        JOIN 
            information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
        WHERE 
            tc.constraint_type = 'UNIQUE'
    ) uq ON c.table_schema = uq.table_schema AND c.table_name = uq.table_name AND c.column_name = uq.column_name
    WHERE
        c.table_schema = 'public'
    ORDER BY
        c.table_name,
        c.ordinal_position
),

-- Get foreign key relationships
foreign_keys AS (
    SELECT
        tc.table_schema, 
        tc.table_name, 
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column
    FROM 
        information_schema.table_constraints tc
    JOIN 
        information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN 
        information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE 
        tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
),

-- Get indexes
table_indexes AS (
    SELECT
        tablename AS table_name,
        indexname AS index_name,
        indexdef AS index_definition
    FROM
        pg_indexes
    WHERE
        schemaname = 'public'
)

-- Main query to build the complete schema report
SELECT
    t.table_name,
    t.approx_row_count AS estimated_rows,
    t.size_mb AS size_in_mb,
    t.table_description,
    string_agg(
        '    ' || c.column_name || ' ' || c.full_data_type || 
        CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN c.column_default IS NOT NULL THEN ' DEFAULT ' || c.column_default ELSE '' END ||
        CASE WHEN c.is_primary_key != '' THEN ' ' || c.is_primary_key ELSE '' END ||
        CASE WHEN c.is_unique != '' THEN ' ' || c.is_unique ELSE '' END ||
        CASE 
            WHEN fk.referenced_table IS NOT NULL 
            THEN ' -> ' || fk.referenced_table || '(' || fk.referenced_column || ')' 
            ELSE '' 
        END ||
        CASE WHEN c.column_description != '' THEN ' -- ' || c.column_description ELSE '' END,
        E'\n'
        ORDER BY c.ordinal_position
    ) AS columns,
    string_agg(
        '    ' || i.index_name || ': ' || i.index_definition,
        E'\n'
        ORDER BY i.index_name
    ) AS indexes
FROM
    table_counts t
LEFT JOIN
    column_details c ON t.table_name = c.table_name
LEFT JOIN
    foreign_keys fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
LEFT JOIN
    table_indexes i ON t.table_name = i.table_name
GROUP BY
    t.table_name, t.approx_row_count, t.size_mb, t.table_description
ORDER BY
    t.table_name;

-- Additional query to show RLS policies
SELECT
    c.relname AS table_name,
    pol.polname AS policy_name,
    CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END AS command,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression
FROM
    pg_policy pol
JOIN
    pg_class c ON pol.polrelid = c.oid
JOIN
    pg_namespace n ON c.relnamespace = n.oid
WHERE
    n.nspname = 'public'
ORDER BY
    table_name, policy_name; 