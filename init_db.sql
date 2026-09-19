IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'EduSDb')
BEGIN
    CREATE DATABASE EduSDb;
END
GO
SELECT name FROM sys.databases WHERE name = 'EduSDb';
GO
