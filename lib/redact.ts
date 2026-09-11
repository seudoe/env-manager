// Project env content commonly embeds the project's own access
// credentials (ENV_MANAGER_PROJECTID / ENV_MANAGER_TOKEN — see the
// default template in app/api/projects/route.ts), because that's what
// the CLI bootstrap needs in a real .env file. But a "viewer" contributor
// is meant to have read-only access through the web app; if the raw
// token value is included in what they're shown, they can lift it out of
// the text and use it directly against /api/get-env — which authenticates
// on the token alone — giving them the practical equivalent of editor
// access despite the UI/permission system saying "viewer".
//
// Editors are intentionally NOT redacted here: they already have write
// access to this same content via PUT /api/projects/[id]/env, so seeing
// the token isn't a privilege escalation for them, and redacting would
// risk them saving the placeholder text back over the real token.
const TOKEN_LINE = /^([ \t]*ENV_MANAGER_TOKEN[ \t]*=[ \t]*).+$/gm;

export function redactProjectTokenForViewer(data: string): string {
  return data.replace(TOKEN_LINE, "$1<hidden — ask the project owner, or have them rotate it in Settings>");
}
