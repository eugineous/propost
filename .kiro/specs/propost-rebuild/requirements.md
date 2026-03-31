# Requirements Document

## Introduction

ProPost is a social media operating system built exclusively for Eugine Micah — a media entrepreneur, storytelling strategist, and digital content creator based in Nairobi, Kenya. ProPost is not a scheduler. It is a living, multi-agent command center structured as a group of six companies, each dedicated to a specific social media platform or intelligence function, all reporting to the founder.

The system replaces a broken prior implementation where all API calls were mocked, agents returned hardcoded strings, the activity feed was randomly generated, the Gemini API was non-functional, platform credentials were missing or unwired, the database was empty, webhooks were never verified, and Vercel cron jobs had stopped. This rebuild starts from zero with real integrations, real AI calls, real posting, and real data.

ProPost must feel like a command center — a virtual office with animated agent characters, six company rooms, a live activity feed of real actions, and a founder-facing interface that gives full visibility and control over every platform, agent, and content operation.

---

## Glossary

- **ProPost**: The social media operating system being built
- **Founder**: Eugine Micah, the sole operator and owner of ProPost
- **SOVEREIGN**: The supreme intelligence agent that orchestrates all companies and reports directly to the Founder
- **Company**: One of six operational units, each owning a platform or intelligence domain
- **CEO Agent**: The lead agent of each Company (ZARA, NOVA, AURORA, CHIEF, ROOT, ORACLE)
- **XForce_Corp**: The company managing X/Twitter operations
- **LinkedElite_Corp**: The company managing LinkedIn operations
- **GramGod_Corp**: The company managing Instagram operations
- **PagePower_Corp**: The company managing Facebook operations
- **WebBoss_Corp**: The company managing the Founder's website (euginemicah.tech)
- **IntelCore_Corp**: The intelligence company managing cross-platform strategy, memory, trend analysis, and reporting
- **Agent**: An AI-powered worker with a defined role, tier, and set of responsibilities
- **Task**: A discrete unit of work assigned to an Agent
- **Action**: A real, executed operation (post, reply, DM, publish, etc.) recorded in the system
- **Activity_Feed**: A real-time log of actual Actions performed by Agents
- **Content_Pillar**: One of ten defined content themes used to guide content creation
- **AI_Router**: The internal component that selects between Gemini and NVIDIA APIs per task
- **Fallback_Engine**: The component that handles failures by escalating through fallback tiers
- **Platform_API**: A native social media platform API (X, Instagram, Facebook, LinkedIn)
- **Browser_Automation**: Playwright-based automation used when a Platform_API is unavailable
- **Approval_Queue**: A queue of Actions requiring Founder review before execution
- **Memory_Store**: The persistent storage of agent context, decisions, and learned patterns
- **Content_Calendar**: The scheduled plan of content across all platforms
- **Dashboard**: The Founder-facing web interface for monitoring and controlling ProPost
- **Virtual_Office**: The animated visual layer of the Dashboard showing agent characters in rooms
- **Neon_DB**: The Neon Postgres database used for persistent storage
- **Vercel**: The deployment platform for the Next.js application
- **Cloudflare_Worker**: A Cloudflare edge worker used for webhook handling and edge logic
- **HAWK**: The compliance and anti-ban control agent
- **QC_Agent**: The quality control agent that reviews content before publishing
- **Tone_Validator**: The agent that validates content tone against the Founder's voice guidelines
- **Risk_Analyzer**: The agent that assesses risk before sensitive actions are executed
- **Approval_Gate**: The agent that routes actions requiring human approval to the Approval_Queue
- **Health_Monitor**: The system agent that monitors agent and platform health
- **Task_Orchestrator**: The system agent that assigns and tracks tasks across all agents
- **Logger**: The system agent that records all actions and events to persistent storage
- **Analytics_Engine**: The system agent that aggregates and reports platform performance data

---

## Requirements

### Requirement 1: Real Platform Posting

**User Story:** As the Founder, I want agents to actually post content to X, Instagram, Facebook, and LinkedIn using real API credentials, so that my social media presence is managed without manual effort.

#### Acceptance Criteria

1. WHEN an Agent executes a post Task, THE Platform_API SHALL receive a real HTTP request using stored credentials and return a platform-confirmed post ID
2. WHEN a Platform_API call succeeds, THE Logger SHALL record the Action with the platform post ID, timestamp, agent name, content, and platform
3. WHEN a Platform_API call fails, THE Fallback_Engine SHALL escalate to Browser_Automation before marking the Task as failed
4. WHEN Browser_Automation also fails, THE Fallback_Engine SHALL place the Task in the Approval_Queue with a failure reason and retry schedule
5. THE System SHALL never return a hardcoded or mocked response as a successful post result
6. WHEN a post is published, THE Activity_Feed SHALL display the real post content, platform, agent, and timestamp within 5 seconds of confirmation

---

### Requirement 2: Real AI Content Generation

**User Story:** As the Founder, I want agents to generate content using real Gemini and NVIDIA API calls, so that every post reflects intelligent, on-brand writing rather than hardcoded strings.

#### Acceptance Criteria

1. WHEN an Agent requires content generation, THE AI_Router SHALL select either the Gemini API or NVIDIA API based on task type, latency, and availability
2. WHEN the selected AI provider returns an error or times out after 10 seconds, THE AI_Router SHALL retry the request once with the alternate provider
3. WHEN both providers fail, THE Fallback_Engine SHALL place the content Task in the Approval_Queue with a draft prompt for the Founder to complete manually
4. THE System SHALL never return a hardcoded string as AI-generated content
5. WHEN content is generated, THE Tone_Validator SHALL verify the output matches the Founder's voice profile before the content proceeds to QC_Agent
6. WHEN the Tone_Validator rejects content, THE AI_Router SHALL regenerate the content with a corrected prompt up to 2 additional times before escalating to the Approval_Queue

---

### Requirement 3: Agent Hierarchy and Orchestration

**User Story:** As the Founder, I want a structured agent hierarchy where SOVEREIGN coordinates all companies and CEOs manage their teams, so that the system operates like a real organization.

#### Acceptance Criteria

1. THE SOVEREIGN SHALL be the single entry point for all cross-company strategic decisions and SHALL delegate Tasks to the appropriate CEO Agent
2. WHEN the Founder sends a command, THE SOVEREIGN SHALL parse the intent, identify the target Company or Companies, and dispatch Tasks to the relevant CEO Agents within 3 seconds
3. WHEN a CEO Agent receives a Task, THE CEO Agent SHALL decompose it into sub-tasks and assign each sub-task to the appropriate Tier 2, Tier 3, or Tier 4 Agent
4. WHEN a Tier 3 Agent completes an Action, THE Task_Orchestrator SHALL update the Task status and notify the parent CEO Agent
5. WHEN a CEO Agent's team completes all sub-tasks, THE CEO Agent SHALL report completion status to SOVEREIGN
6. THE Task_Orchestrator SHALL maintain a real-time task board showing every active, queued, and completed Task with agent assignment and status
7. WHILE any Agent is executing a Task, THE Health_Monitor SHALL track the agent's status and mark it as active in the Dashboard

---

### Requirement 4: XForce Corp — X/Twitter Operations

**User Story:** As the Founder, I want XForce Corp to manage all X/Twitter activity including posting, replying, threading, trend monitoring, and growth, so that my X presence is fully automated and strategic.

#### Acceptance Criteria

1. WHEN a scheduled post time arrives, ZARA SHALL instruct the appropriate Tier 3 Agent to publish the post to X using the X API v2
2. WHEN a trending topic is detected by the trend analyst agent, THE Agent SHALL notify ZARA with the topic, volume score, and relevance score within 60 seconds of detection
3. WHEN a reply opportunity is identified, THE reply specialist Agent SHALL draft a reply, pass it through QC_Agent and Tone_Validator, and submit it to the Approval_Queue if the account has fewer than 10,000 followers or post it directly if above that threshold
4. WHEN a thread is to be published, THE post executor Agent SHALL publish all thread parts in sequence with a minimum 2-second delay between each part
5. WHEN the X API rate limit is reached, HAWK SHALL pause all X posting Tasks and schedule a resume time based on the rate limit reset window
6. IF the X API credentials are invalid or expired, THEN THE System SHALL alert the Founder via the Dashboard and halt all X posting Tasks until credentials are updated

---

### Requirement 5: LinkedElite Corp — LinkedIn Operations

**User Story:** As the Founder, I want LinkedElite Corp to manage LinkedIn authority building, thought leadership posts, networking, and professional growth, so that my LinkedIn presence reflects my expertise.

#### Acceptance Criteria

1. WHEN a LinkedIn post is scheduled, NOVA SHALL instruct the content creator Agent to generate a professional post aligned with the active Content_Pillar and publish it via the LinkedIn API
2. WHEN a connection request opportunity is identified, THE networking Agent SHALL draft a personalized connection message and submit it to the Approval_Queue before sending
3. WHEN a LinkedIn article is to be published, THE content creator Agent SHALL generate the full article, pass it through QC_Agent and Tone_Validator, and submit it to the Approval_Queue for Founder review before publishing
4. WHEN the LinkedIn access token expires, THE System SHALL detect the expiry, alert the Founder, and halt all LinkedIn Tasks until a new token is provided
5. THE System SHALL enforce a maximum of 100 LinkedIn connection requests per day to comply with LinkedIn platform limits

---

### Requirement 6: GramGod Corp — Instagram Operations

**User Story:** As the Founder, I want GramGod Corp to manage Instagram posts, reels, stories, DMs, captions, and community engagement, so that my Instagram presence grows consistently.

#### Acceptance Criteria

1. WHEN a post is scheduled for Instagram, AURORA SHALL instruct the caption Agent to generate a caption with hashtags and the post executor Agent to publish via the Instagram Graph API
2. WHEN a reel is to be published, THE reel Agent SHALL generate a caption, select appropriate hashtags, and publish the reel via the Instagram Graph API with the provided media URL
3. WHEN a story is scheduled, THE story Agent SHALL publish it via the Instagram Graph API within 2 minutes of the scheduled time
4. WHEN a DM is received on Instagram, THE DM handler Agent SHALL classify the message as a brand inquiry, fan message, or spam, and respond to non-spam messages within 30 minutes using a generated reply submitted to the Approval_Queue
5. WHEN the Instagram Graph API returns a media upload error, THE Fallback_Engine SHALL retry the upload up to 3 times with exponential backoff before escalating to the Approval_Queue
6. THE System SHALL never post to Instagram more than 25 times per day to comply with Graph API limits

---

### Requirement 7: PagePower Corp — Facebook Operations

**User Story:** As the Founder, I want PagePower Corp to manage Facebook page content, comments, and community management, so that my Facebook page remains active and engaged.

#### Acceptance Criteria

1. WHEN a Facebook post is scheduled, CHIEF SHALL instruct the content creator Agent to generate the post and publish it via the Facebook Graph API
2. WHEN a comment is received on a Facebook post, THE community Agent SHALL classify it as positive, neutral, negative, or spam, and generate a reply for non-spam comments submitted to the Approval_Queue
3. WHEN a Facebook post receives more than 50 reactions within 1 hour, THE analytics Agent SHALL notify SOVEREIGN and CHIEF with a performance alert
4. IF the Facebook Page access token expires, THEN THE System SHALL alert the Founder and halt all Facebook posting Tasks until a valid token is provided
5. THE System SHALL enforce a minimum 30-minute gap between consecutive Facebook posts to avoid platform suppression

---

### Requirement 8: WebBoss Corp — Website Operations

**User Story:** As the Founder, I want WebBoss Corp to manage euginemicah.tech including SEO, blog publishing, performance monitoring, and security, so that my website remains current and optimized.

#### Acceptance Criteria

1. WHEN a blog post is ready for publication, ROOT SHALL instruct the build Agent to publish the post to euginemicah.tech via the Vercel deployment API or CMS integration
2. WHEN a new blog post is published, THE SEO Agent SHALL generate a meta title, meta description, and structured data markup for the post
3. WHEN the website response time exceeds 3 seconds for 3 consecutive health checks, THE speed Agent SHALL alert ROOT and SOVEREIGN with a performance degradation report
4. WHEN a security scan detects a vulnerability, THE shield Agent SHALL alert ROOT and SOVEREIGN immediately and log the finding with severity level and recommended action
5. THE crawl Agent SHALL perform a full SEO audit of euginemicah.tech every 7 days and store the results in Neon_DB

---

### Requirement 9: IntelCore Corp — Intelligence and Strategy

**User Story:** As the Founder, I want IntelCore Corp to provide cross-platform intelligence, memory, trend analysis, risk assessment, and strategic reporting, so that all companies operate with shared context and aligned strategy.

#### Acceptance Criteria

1. WHEN ORACLE receives performance data from all CEO Agents, THE Analytics_Engine SHALL aggregate the data and generate a weekly cross-platform performance report stored in Neon_DB
2. WHEN a trend is detected on any platform, THE trend analyst Agent SHALL assess its relevance to each of the 10 Content_Pillars and distribute a trend brief to all relevant CEO Agents within 5 minutes
3. WHEN an Agent completes a significant Action, THE Memory_Store SHALL record the action context, outcome, and any learned patterns for future reference
4. WHEN a high-risk action is proposed (account deletion, mass unfollow, bulk DM), THE Risk_Analyzer SHALL block the action and require explicit Founder approval via the Approval_Queue
5. THE Memory_Store SHALL retain agent memory for a minimum of 90 days and allow the Founder to browse, search, and export memory entries from the Dashboard
6. WHEN SOVEREIGN requests a strategic brief, ORACLE SHALL generate a cross-platform summary including top performing content, growth metrics, risk flags, and recommended next actions

---

### Requirement 10: Content Pillar System

**User Story:** As the Founder, I want all content to be generated according to 10 defined content pillars with AI News as the primary pillar, so that my content strategy is consistent and on-brand across all platforms.

#### Acceptance Criteria

1. THE System SHALL support exactly 10 Content_Pillars: AI News, Youth Empowerment, Trending Topics, Elite Conversations, Kenyan Entertainment, Fashion, Media and Journalism, Personal Story, Entrepreneurship, and Culture and Identity
2. WHEN content is generated, THE content creator Agent SHALL tag the content with exactly one primary Content_Pillar
3. THE AI News Content_Pillar SHALL be scheduled for publication every 6 hours (4 times per day) across all active platforms
4. WHEN an AI News post is generated, THE content creator Agent SHALL source the topic from a real-time AI news feed or trend signal, not from a static list
5. WHEN content is generated for a specific platform, THE content creator Agent SHALL apply platform-specific formatting rules: X posts under 280 characters, LinkedIn posts in professional long-form, Instagram posts with hashtag blocks, Facebook posts with community-oriented framing
6. THE Tone_Validator SHALL enforce the Founder's voice profile: authority-driven, culturally grounded, storytelling-forward, using em dashes, avoiding AI filler phrases

---

### Requirement 11: Human-Like Behavior and Anti-Ban Compliance

**User Story:** As the Founder, I want all automated actions to mimic human behavior patterns so that platform algorithms do not flag or ban the accounts.

#### Acceptance Criteria

1. WHEN an Agent posts content, THE System SHALL introduce a randomized delay between 30 seconds and 5 minutes from the scheduled time before executing the post
2. WHEN an Agent performs sequential actions on the same platform, THE System SHALL enforce a minimum 2-minute gap between consecutive actions on that platform
3. HAWK SHALL monitor the action rate per platform per hour and halt all actions on a platform if the rate exceeds the platform-defined safe threshold
4. WHEN HAWK detects a rate threshold breach, THE System SHALL pause all actions on the affected platform for a minimum of 1 hour and alert the Founder
5. THE System SHALL vary post timing, content length, hashtag count, and engagement patterns across sessions to avoid detectable robotic patterns
6. WHEN an account receives a platform warning or restriction, HAWK SHALL immediately halt all automated actions on that account and escalate to the Approval_Queue for Founder review

---

### Requirement 12: Approval Queue and Human-in-the-Loop

**User Story:** As the Founder, I want a clear approval queue where I can review, approve, reject, or edit any action before it executes, so that I maintain full control over sensitive operations.

#### Acceptance Criteria

1. WHEN an action is placed in the Approval_Queue, THE Dashboard SHALL display it with the action type, target platform, agent name, content preview, risk level, and timestamp
2. WHEN the Founder approves an action, THE Approval_Gate SHALL release it to the executing Agent within 10 seconds
3. WHEN the Founder rejects an action, THE Approval_Gate SHALL cancel the Task and notify the originating Agent with the rejection reason
4. WHEN the Founder edits an action in the Approval_Queue, THE System SHALL replace the original content with the edited version before releasing it to the executing Agent
5. WHEN an Approval_Queue item has been pending for more than 24 hours without Founder action, THE System SHALL send a Dashboard notification reminding the Founder to review it
6. THE Approval_Queue SHALL require Founder approval for: all LinkedIn articles, all DM responses, all connection requests, all actions flagged by Risk_Analyzer, and all first-time actions on any platform

---

### Requirement 13: Fallback Engine

**User Story:** As the Founder, I want every action to have a defined fallback path so that failures are handled gracefully and nothing silently breaks.

#### Acceptance Criteria

1. WHEN a Platform_API call fails, THE Fallback_Engine SHALL attempt Browser_Automation as the first fallback within 30 seconds
2. WHEN Browser_Automation fails, THE Fallback_Engine SHALL place the Task in the Approval_Queue with full failure context and a suggested retry time
3. WHEN an AI provider call fails, THE Fallback_Engine SHALL switch to the alternate AI provider within 5 seconds
4. WHEN both AI providers fail, THE Fallback_Engine SHALL place the content Task in the Approval_Queue with the original prompt for manual completion
5. WHEN a database write fails, THE Fallback_Engine SHALL retry the write up to 3 times with exponential backoff before logging a critical error to the Dashboard
6. THE Fallback_Engine SHALL never silently discard a failed Task — every failure SHALL be logged with error type, timestamp, agent, task ID, and attempted fallback steps

---

### Requirement 14: Dashboard — Command Center Interface

**User Story:** As the Founder, I want a dashboard that gives me full visibility and control over every agent, platform, task, and action in real time, so that I can operate ProPost like a command center.

#### Acceptance Criteria

1. THE Dashboard SHALL display a real-time Activity_Feed showing the last 100 real Actions with platform, agent, content preview, and timestamp
2. THE Dashboard SHALL display a Company Map showing all 6 Companies with their CEO Agent status and active task count
3. THE Dashboard SHALL display an Agent Roster showing every Agent with current status (active, idle, paused, error), current task, and last action time
4. THE Dashboard SHALL display a Task Board showing all active, queued, pending approval, and completed Tasks filterable by company, agent, and platform
5. THE Dashboard SHALL display a Content_Calendar showing scheduled content across all platforms for the next 30 days
6. THE Dashboard SHALL display platform status indicators showing API connection health for X, Instagram, Facebook, LinkedIn, and the website
7. WHEN the Founder types a message in the command input, THE SOVEREIGN SHALL receive the message and respond with a structured action plan or confirmation within 5 seconds
8. THE Dashboard SHALL display the Approval_Queue with all pending items sorted by urgency and age
9. THE Dashboard SHALL display a Memory_Browser allowing the Founder to search and view agent memory entries by agent, date, platform, and keyword

---

### Requirement 15: Virtual Office Visual Layer

**User Story:** As the Founder, I want the Dashboard to include a virtual office with animated agent characters in six rooms, so that the system feels alive and engaging rather than like a static admin panel.

#### Acceptance Criteria

1. THE Virtual_Office SHALL render 6 rooms: War Room (XForce), Studio (GramGod), Boardroom (LinkedElite), Community Hall (PagePower), Engine Room (WebBoss), and Situation Room (IntelCore)
2. WHEN an Agent is active, THE Virtual_Office SHALL animate the agent character to reflect working state (typing, moving, signaling)
3. WHEN an Agent is idle, THE Virtual_Office SHALL animate the agent character in a resting or standby state
4. WHEN the Founder clicks an Agent character, THE Dashboard SHALL display a panel showing the agent's current task, recent memory entries, last 10 actions, and current status
5. THE Virtual_Office SHALL use original ProPost visual identity with pixel-art or 3D-style characters distinct from any third-party library
6. WHEN a new Action is logged, THE Virtual_Office SHALL briefly highlight the room of the responsible Company to indicate activity

---

### Requirement 16: Credential and Secret Management

**User Story:** As the Founder, I want all API credentials and secrets to be stored securely and never hardcoded in source code, so that the system is secure and credentials can be rotated without code changes.

#### Acceptance Criteria

1. THE System SHALL read all API credentials exclusively from environment variables at runtime
2. WHEN an environment variable for a required credential is missing at startup, THE System SHALL log a startup error identifying the missing variable and disable the affected platform's Tasks
3. THE Dashboard SHALL display a Connections panel showing which platform credentials are present, valid, and active — without exposing the credential values
4. WHEN a credential is rotated, THE System SHALL pick up the new value on the next request without requiring a redeployment
5. THE System SHALL never log, display, or transmit raw credential values in any log, response, or UI element

---

### Requirement 17: Database Integrity and Persistence

**User Story:** As the Founder, I want all actions, tasks, agent memory, content, and analytics to be persisted in Neon Postgres so that no data is lost and the system has full historical context.

#### Acceptance Criteria

1. THE System SHALL persist every Action to Neon_DB with: action ID, agent name, company, platform, action type, content, status, timestamp, and platform response
2. THE System SHALL persist every Task to Neon_DB with: task ID, assigned agent, company, status, created time, started time, completed time, and result
3. THE System SHALL persist every Memory_Store entry to Neon_DB with: entry ID, agent name, context summary, related action IDs, and created timestamp
4. WHEN the Neon_DB connection is unavailable, THE System SHALL queue writes in memory for up to 5 minutes and flush the queue when the connection is restored
5. THE System SHALL run database migrations automatically on deployment and never require manual schema changes in production

---

### Requirement 18: Scheduled Content Automation

**User Story:** As the Founder, I want content to be automatically generated and posted on a defined schedule without manual intervention, so that my platforms stay active even when I am not online.

#### Acceptance Criteria

1. THE System SHALL use Vercel cron jobs or Cloudflare_Worker scheduled triggers to initiate content generation and posting Tasks on schedule
2. WHEN a cron trigger fires, THE Task_Orchestrator SHALL create the appropriate Tasks and assign them to the relevant CEO Agents within 10 seconds
3. THE AI News Content_Pillar SHALL trigger content generation and posting at 06:00, 12:00, 18:00, and 00:00 EAT (East Africa Time) daily across all active platforms
4. WHEN a scheduled Task fails to start within 60 seconds of its trigger time, THE System SHALL log a missed trigger event and attempt to execute the Task immediately
5. THE Content_Calendar SHALL allow the Founder to add, edit, reschedule, or cancel scheduled content from the Dashboard without modifying code or configuration files

---

### Requirement 19: Webhook Handling

**User Story:** As the Founder, I want all platform webhooks to be properly verified and processed so that real-time events like DMs, comments, and mentions trigger the correct agent responses.

#### Acceptance Criteria

1. WHEN a webhook request is received, THE Cloudflare_Worker SHALL verify the platform-specific signature before passing the payload to the processing handler
2. WHEN a webhook signature verification fails, THE System SHALL reject the request with a 403 response and log the failed attempt with the source IP and timestamp
3. WHEN a verified webhook payload is received for a DM event, THE System SHALL route it to the appropriate DM handler Agent within 5 seconds
4. WHEN a verified webhook payload is received for a comment event, THE System SHALL route it to the appropriate community Agent within 5 seconds
5. THE System SHALL support webhook verification for X, Instagram, and Facebook using their respective HMAC or token-based verification methods

---

### Requirement 20: Analytics and Reporting

**User Story:** As the Founder, I want real analytics pulled from platform APIs and aggregated by IntelCore so that I can see what is actually working across all platforms.

#### Acceptance Criteria

1. THE Analytics_Engine SHALL pull real engagement metrics (impressions, likes, comments, shares, follower count) from each platform API every 24 hours and store them in Neon_DB
2. WHEN the Founder opens the Analytics view, THE Dashboard SHALL display real metrics sourced from Neon_DB, not estimated or mocked values
3. THE Analytics_Engine SHALL identify the top 3 performing posts per platform per week and include them in the weekly cross-platform report
4. WHEN a post significantly underperforms (below 10% of the platform average engagement rate), THE Analytics_Engine SHALL flag it and notify ORACLE with a performance note
5. THE Analytics_Engine SHALL track follower growth rate per platform per week and display a trend line in the Dashboard Analytics view

---

### Requirement 21: Founder Direct Messaging to Agents

**User Story:** As the Founder, I want to be able to send a direct message to any agent from the Dashboard and receive a real AI-generated response, so that I can query, redirect, or instruct any agent at any time.

#### Acceptance Criteria

1. WHEN the Founder selects an Agent and sends a message, THE System SHALL route the message to that Agent's AI handler and return a real AI-generated response within 10 seconds
2. WHEN the Founder sends a message to SOVEREIGN, THE SOVEREIGN SHALL interpret the message as a strategic command and respond with a structured action plan
3. WHEN the Founder sends a message to a CEO Agent, THE CEO Agent SHALL respond with a status update on its company's current operations and any pending decisions
4. THE System SHALL persist all Founder-to-Agent conversations in Neon_DB and display them in the agent's conversation history panel
5. WHEN an Agent cannot fulfill a Founder command due to a platform restriction or missing credential, THE Agent SHALL respond with a clear explanation and a recommended resolution step

---

### Requirement 22: System Health Monitoring

**User Story:** As the Founder, I want the system to continuously monitor its own health and alert me to any failures, degraded services, or blocked agents, so that I am never surprised by silent failures.

#### Acceptance Criteria

1. THE Health_Monitor SHALL check the status of all platform API connections every 5 minutes and update the Dashboard platform status indicators
2. WHEN a platform API connection fails 3 consecutive health checks, THE Health_Monitor SHALL mark that platform as degraded and notify the Founder via a Dashboard alert
3. WHEN an Agent has not completed a Task or sent a heartbeat within 10 minutes of its last activity, THE Health_Monitor SHALL mark the Agent as unresponsive and alert SOVEREIGN
4. THE Health_Monitor SHALL check Neon_DB connectivity every 2 minutes and alert the Founder if the connection is unavailable for more than 5 minutes
5. THE Dashboard SHALL display a system health panel showing the status of all platform connections, AI providers, database, and cron triggers with last-checked timestamps
