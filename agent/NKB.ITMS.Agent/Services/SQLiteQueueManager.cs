using Microsoft.Data.Sqlite;

namespace NKB.ITMS.Agent.Services
{
    public class SQLiteQueueManager
    {
        private readonly string _dbPath;

        public SQLiteQueueManager()
        {
            var dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "NKB_ITMS_Agent");
            Directory.CreateDirectory(dir);
            _dbPath = Path.Combine(dir, "offline_queue.db");
            InitializeDatabase();
        }

        private void InitializeDatabase()
        {
            using var conn = new SqliteConnection($"Data Source={_dbPath}");
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                CREATE TABLE IF NOT EXISTS queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    endpoint TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            ";
            cmd.ExecuteNonQuery();
        }

        public void Enqueue(string endpoint, string payloadJson)
        {
            try {
                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();
                var cmd = conn.CreateCommand();
                cmd.CommandText = "INSERT INTO queue (endpoint, payload_json) VALUES ($ep, $json)";
                cmd.Parameters.AddWithValue("$ep", endpoint);
                cmd.Parameters.AddWithValue("$json", payloadJson);
                cmd.ExecuteNonQuery();
            } catch { }
        }
    }
}
