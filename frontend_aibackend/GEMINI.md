# Gemini Workspace Mandates

- **Primary Working Directory:** All project-related tasks, file creation, and command execution MUST be performed within this directory (`C:\Users\<USER>\Desktop\Gemini_Workspace`) or its subdirectories.
- **Context Preservation:** These instructions are foundational and take absolute precedence over general workflows.
- **Safety:** Do not modify or interact with files outside of this workspace unless explicitly directed for specific integration tasks.
- **UI Validation Mandate:** After every modification to UI components (JSX/TSX files), you MUST execute `npm run lint` or `npm run build` to verify there are no syntax or reference errors. NEVER declare a UI task complete without performing this automated verification. This is a mandatory proactive measure to prevent "blank screen" regressions.

