CREATE TABLE "accounts" (
  "id" SERIAL PRIMARY KEY,
  "email" varchar(255) NOT NULL UNIQUE
);
