---
summary: "Run Moltbot with Ollama (local LLM runtime)"
read_when:
  - You want to run Moltbot with local models via Ollama
  - You need Ollama setup and configuration guidance
---
# Ollama

Ollama is a local LLM runtime that makes it easy to run open-source models on your machine. **Ollama has no API key** — it runs locally and does not authenticate. Moltbot enables the Ollama provider when you reference it in config; no fake key is required.

## Quick start

1) Install Ollama: https://ollama.ai

2) Pull a model:

```bash
ollama pull llama3.3
# or
ollama pull qwen2.5-coder:32b
# or
ollama pull deepseek-r1:32b
```

3) Enable Ollama for Moltbot (no API key needed):

**Option A — Set your default model to an Ollama model** (simplest):

```json5
{
  agents: {
    defaults: {
      model: { primary: "ollama/llama3.3" }
    }
  }
}
```

Moltbot will add the Ollama provider and discover models from `http://127.0.0.1:11434`.

**Option B — Define Ollama explicitly** (e.g. custom host/port or tunnel):

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://127.0.0.1:11434/v1",
        api: "openai-completions",
        models: [ { "id": "llama3.3", "name": "Llama 3.3", ... } ]
      }
    }
  }
}
```

No `apiKey` is required; Moltbot fills a sentinel internally so the model registry is satisfied.

**Option C — Legacy:** Set `OLLAMA_API_KEY` to any value (e.g. `ollama-local`) to opt in to implicit discovery. Still supported but unnecessary if you use Option A or B.

4) Use Ollama models:

```json5
{
  agents: {
    defaults: {
      model: { primary: "ollama/llama3.3" }
    }
  }
}
```

## Model discovery (implicit provider)

When you reference Ollama (e.g. `agents.defaults.model.primary: "ollama/llama3.3"` or `models.providers.ollama` in config, or `OLLAMA_API_KEY` set) and **do not** define a full `models.providers.ollama` with models, Moltbot discovers models from the local Ollama instance at `http://127.0.0.1:11434`:

- Queries `/api/tags` and `/api/show`
- Keeps only models that report `tools` capability
- Marks `reasoning` when the model reports `thinking`
- Reads `contextWindow` from `model_info["<arch>.context_length"]` when available
- Sets `maxTokens` to 10× the context window
- Sets all costs to `0`

This avoids manual model entries while keeping the catalog aligned with Ollama's capabilities.

To see what models are available:

```bash
ollama list
moltbot models list
```

To add a new model, simply pull it with Ollama:

```bash
ollama pull mistral
```

The new model will be automatically discovered and available to use.

If you set `models.providers.ollama` explicitly, auto-discovery is skipped and you must define models manually (see below).

## Configuration

### Basic setup (no API key)

The simplest way is to set your default model to an Ollama model in config; no environment variable or API key is needed:

```json5
{
  agents: {
    defaults: {
      model: { primary: "ollama/llama3.3" }
    }
  }
}
```

Alternatively, set `OLLAMA_API_KEY` to any value to opt in to implicit discovery (legacy).

### Explicit setup (manual models)

Use explicit config when:
- Ollama runs on another host/port.
- You want to force specific context windows or model lists.
- You want to include models that do not report tool support.

```json5
{
  models: {
    providers: {
      ollama: {
        // Use a host that includes /v1 for OpenAI-compatible APIs
        baseUrl: "http://ollama-host:11434/v1",
        apiKey: "ollama-local",
        api: "openai-completions",
        models: [
          {
            id: "llama3.3",
            name: "Llama 3.3",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 8192,
            maxTokens: 8192 * 10
          }
        ]
      }
    }
  }
}
```

If `OLLAMA_API_KEY` is set, you can omit `apiKey` in the provider entry and Moltbot will fill it for availability checks.

### Custom base URL (explicit config)

If Ollama is running on a different host or port (explicit config disables auto-discovery, so define models manually):

```json5
{
  models: {
    providers: {
      ollama: {
        apiKey: "ollama-local",
        baseUrl: "http://ollama-host:11434/v1"
      }
    }
  }
}
```

### Model selection

Once configured, all your Ollama models are available:

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "ollama/llama3.3",
        fallback: ["ollama/qwen2.5-coder:32b"]
      }
    }
  }
}
```

## Advanced

### Reasoning models

Moltbot marks models as reasoning-capable when Ollama reports `thinking` in `/api/show`:

```bash
ollama pull deepseek-r1:32b
```

### Model Costs

Ollama is free and runs locally, so all model costs are set to $0.

### Context windows

For auto-discovered models, Moltbot uses the context window reported by Ollama when available, otherwise it defaults to `8192`. You can override `contextWindow` and `maxTokens` in explicit provider config.

## Troubleshooting

### Ollama not detected

Make sure Ollama is running and that you set `OLLAMA_API_KEY` (or an auth profile), and that you did **not** define an explicit `models.providers.ollama` entry:

```bash
ollama serve
```

And that the API is accessible:

```bash
curl http://localhost:11434/api/tags
```

### No models available

Moltbot only auto-discovers models that report tool support. If your model isn't listed, either:
- Pull a tool-capable model, or
- Define the model explicitly in `models.providers.ollama`.

To add models:

```bash
ollama list  # See what's installed
ollama pull llama3.3  # Pull a model
```

### Connection refused

Check that Ollama is running on the correct port:

```bash
# Check if Ollama is running
ps aux | grep ollama

# Or restart Ollama
ollama serve
```

## See Also

- [Model Providers](/concepts/model-providers) - Overview of all providers
- [Model Selection](/concepts/models) - How to choose models
- [Configuration](/gateway/configuration) - Full config reference
