export const NAME = "@clack120/laftel";
export const VERSION = "0.2.1";

const embeddedRevision = "__LAFTEL_GIT_REVISION__";
const revision: RegExpExecArray | null = /^([0-9a-f]{7,40})(\.dirty)?$/i.exec(embeddedRevision);
export const GIT_COMMIT: string | undefined = revision?.[1];
export const GIT_DIRTY: boolean = !!revision?.[2];
export const BUILD_VERSION = GIT_COMMIT ? `${VERSION}+${GIT_COMMIT}${GIT_DIRTY ? ".dirty" : ""}` : VERSION;

export const USER_AGENT = `${NAME}/${BUILD_VERSION}`;
