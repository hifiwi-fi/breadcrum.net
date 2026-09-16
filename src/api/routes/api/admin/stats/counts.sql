WITH yearly_counts AS (
  SELECT
    'Users' AS label,
    EXTRACT(YEAR FROM created_at)::int AS year,
    COUNT(*) AS count
  FROM users
  GROUP BY EXTRACT(YEAR FROM created_at)
  UNION ALL
  SELECT
    'Bookmarks' AS label,
    EXTRACT(YEAR FROM created_at)::int AS year,
    COUNT(*) AS count
  FROM bookmarks
  GROUP BY EXTRACT(YEAR FROM created_at)
  UNION ALL
  SELECT
    'Tags' AS label,
    EXTRACT(YEAR FROM created_at)::int AS year,
    COUNT(*) AS count
  FROM tags
  GROUP BY EXTRACT(YEAR FROM created_at)
  UNION ALL
  SELECT
    'Episodes' AS label, -- Moved Episodes before Archives
    EXTRACT(YEAR FROM created_at)::int AS year,
    COUNT(*) AS count
  FROM episodes
  WHERE ready = true
  GROUP BY EXTRACT(YEAR FROM created_at)
  UNION ALL
  SELECT
    'Archives' AS label,
    EXTRACT(YEAR FROM created_at)::int AS year,
    COUNT(*) AS count
  FROM archives
  WHERE ready = true
  GROUP BY EXTRACT(YEAR FROM created_at)
), cumulative AS (
  SELECT
    label,
    year,
    SUM(count) OVER (PARTITION BY label ORDER BY year) AS cumulative_count
  FROM yearly_counts
)
SELECT
  label,
  year,
  cumulative_count
FROM cumulative
ORDER BY CASE label
           WHEN 'Users' THEN 1
           WHEN 'Bookmarks' THEN 2
           WHEN 'Tags' THEN 3
           WHEN 'Episodes' THEN 4 -- Updated order
           WHEN 'Archives' THEN 5
         END,
         year;
