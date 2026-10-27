export const NAME = "@clack120/laftel";
export const VERSION = "0.2.0";

const embeddedCommit = "__LAFTEL_GIT_COMMIT__";
export const GIT_COMMIT: string | undefined = /^[0-9a-f]{7,40}$/i.test(embeddedCommit) ? embeddedCommit : undefined;
export const BUILD_VERSION = GIT_COMMIT ? `${VERSION}+g${GIT_COMMIT}` : VERSION;

export const USER_AGENT = `${NAME}/${BUILD_VERSION}`;
export const GOOGLEBOT_USER_AGENT = `${USER_AGENT} (compatible; Googlebot)`;
