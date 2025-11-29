-- Drop existing trigger and function with cascade
DROP TRIGGER IF EXISTS reset_scans_monthly ON profiles;
DROP FUNCTION IF EXISTS reset_monthly_scans() CASCADE;

-- Create trigger to automatically increment scan count when a scan is created
DROP TRIGGER IF EXISTS on_scan_created ON scans;
CREATE TRIGGER on_scan_created
  AFTER INSERT ON scans
  FOR EACH ROW
  EXECUTE FUNCTION increment_scan_count();