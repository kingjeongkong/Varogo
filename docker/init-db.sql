SELECT 'CREATE DATABASE varogo_test_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'varogo_test_db')\gexec
GRANT ALL PRIVILEGES ON DATABASE varogo_test_db TO varogo;
