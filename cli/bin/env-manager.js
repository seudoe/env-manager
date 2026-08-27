#!/usr/bin/env node
"use strict";

const { program } = require("commander");
const { runInit } = require("../lib/init");
const { runSync } = require("../lib/sync");

program
  .name("env-manager")
  .description("One-command setup and sync for Env Manager")
  .version("1.0.0");

program
  .command("init")
  .description("Connect this project to Env Manager")
  .option("-p, --project <id>", "Project ID (envp_...)")
  .option("-t, --token <token>", "Project token (envt_...)")
  .option("-u, --url <url>", "Env Manager server URL", "https://env-manage.vercel.app")
  .option("--language <lang>", "Force language: node or python")
  .option("--script <name>", "package.json script name to patch (e.g. dev, start)")
  .option("--no-sync", "Skip the sync-now prompt after init")
  .action(async (options) => {
    try {
      await runInit(options);
    } catch (err) {
      console.error("\n[env-manager] Error:", err.message);
      process.exit(1);
    }
  });

program
  .command("sync")
  .description("Fetch the canonical .env from the server (overwrites local .env)")
  .option("-u, --url <url>", "Env Manager server URL", "https://env-manage.vercel.app")
  .action(async (options) => {
    try {
      await runSync(options);
    } catch (err) {
      console.error("\n[env-manager] Error:", err.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
