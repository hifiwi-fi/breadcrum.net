WITH yearly_counts AS (
  SELECT
    'Users' AS label,
    EXTRACT(YEAR FROM created_at) AS year,
    COUNT(*) AS count
  FROM users
  WHERE created_at <= '2024-12-31'
  GROUP BY EXTRACT(YEAR FROM created_at)
  UNION ALL
  SELECT
    'Bookmarks' AS label,
    EXTRACT(YEAR FROM created_at) AS year,
    COUNT(*) AS count
  FROM bookmarks
  WHERE created_at <= '2024-12-31'
  GROUP BY EXTRACT(YEAR FROM created_at)
  UNION ALL
  SELECT
    'Tags' AS label,
    EXTRACT(YEAR FROM created_at) AS year,
    COUNT(*) AS count
  FROM tags
  WHERE created_at <= '2024-12-31'
  GROUP BY EXTRACT(YEAR FROM created_at)
  UNION ALL
  SELECT
    'Episodes' AS label, -- Moved Episodes before Archives
    EXTRACT(YEAR FROM created_at) AS year,
    COUNT(*) AS count
  FROM episodes
  WHERE created_at <= '2024-12-31'
  AND ready = true
  GROUP BY EXTRACT(YEAR FROM created_at)
  UNION ALL
  SELECT
    'Archives' AS label,
    EXTRACT(YEAR FROM created_at) AS year,
    COUNT(*) AS count
  FROM archives
  WHERE created_at <= '2024-12-31'
  AND ready = true
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
  MAX(CASE WHEN year = 2021 THEN cumulative_count ELSE 0 END) AS "2021",
  MAX(CASE WHEN year = 2022 THEN cumulative_count ELSE 0 END) AS "2022",
  MAX(CASE WHEN year = 2023 THEN cumulative_count ELSE 0 END) AS "2023",
  MAX(CASE WHEN year = 2024 THEN cumulative_count ELSE 0 END) AS "2024"
FROM cumulative
GROUP BY label
ORDER BY CASE label
           WHEN 'Users' THEN 1
           WHEN 'Bookmarks' THEN 2
           WHEN 'Tags' THEN 3
           WHEN 'Episodes' THEN 4 -- Updated order
           WHEN 'Archives' THEN 5
         END;
