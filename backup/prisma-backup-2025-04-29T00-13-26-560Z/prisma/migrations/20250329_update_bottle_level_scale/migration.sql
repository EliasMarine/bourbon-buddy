-- Update existing bottle levels from 0-8 scale to 0-100 scale
UPDATE "Spirit"
SET "bottleLevel" = CASE
  WHEN "bottleLevel" = 0 THEN 0
  WHEN "bottleLevel" = 1 THEN 12
  WHEN "bottleLevel" = 2 THEN 25
  WHEN "bottleLevel" = 3 THEN 37
  WHEN "bottleLevel" = 4 THEN 50
  WHEN "bottleLevel" = 5 THEN 62
  WHEN "bottleLevel" = 6 THEN 75
  WHEN "bottleLevel" = 7 THEN 87
  WHEN "bottleLevel" = 8 THEN 100
  ELSE "bottleLevel"
END
WHERE "bottleLevel" <= 8; 