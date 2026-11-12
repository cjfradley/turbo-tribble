## AI notes
AI tool used: Claude Code   
AI Model for planing: Opus 5.5 medium effort  
AI Model for implementation: Sonnet 5.5 (app is not too complex and tasks are pretty straight forward)  

Rough token usage
- 150K Tokens for project to date

What I did to save tokens:
- install packages myself
- setup basic app structure myself
- pre plan which components need implementing and set fixed stop when letting agent run
- switch to new context window when starting debug session or adding new feature
- specify which files contain information needed for current tasks so agent doesn't need to search whole project

Would have done to save tokens:
- research more myself if time is not as much of an issue
- setup proper agent/subagent workflow for better context management if time allows
- not use third party css library

Initial plannig of project took too long because brief of project was not narrowed down beforehand by me.
Resulted in agent having too many questions regarding basic functionality of the project.

Made the decision to only create client for initial project even though AI wanted to create whole application from the get go.

## Next steps

1. Implement rest of missing functionality (upload, delete, Teams picker) including Tests
2. Test with actual m365 Tenant and User Accounts
3. Setup Hosting environment
4. Setup deployment