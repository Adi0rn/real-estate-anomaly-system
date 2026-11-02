try {
  const resolved = require.resolve("server-only");
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports: {},
    children: [],
    paths: [],
    require: require,
    isPreloading: false,
  } as unknown as NodeModule;
} catch {
  // Ignored
}
