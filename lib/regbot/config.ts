/** Default model for live RegBot answers; override with REGBOT_MODEL. */
export const REGBOT_DEFAULT_MODEL = "claude-opus-5";

/** Live answers need an Anthropic API key; without one RegBot uses the demo pipeline. */
export const regbotLiveEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);
