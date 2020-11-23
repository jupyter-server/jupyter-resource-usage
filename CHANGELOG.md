# Changelog

## 0.4.0

- Soft-deprecate `/metrics` endpoint: https://github.com/yuvipanda/nbresuse/pull/68 
- `nbresuse` now exposes a new endpoint: `/api/metrics/v1`: https://github.com/yuvipanda/nbresuse/pull/68 

### Migrating to 0.4.0

To upgrade to the latest version:

```
python -m pip install -U nbresuse
```

If you use the classic notebook, there shouldn't be anything to do. The classic notebook extension already uses the new endpoint and is automatically installed.

If you use JupyterLab 2.x and want the memory usage indicator in the status bar to continue showing metrics:

![image](https://user-images.githubusercontent.com/591645/99947412-3c8b0000-2d78-11eb-868a-6a2da419a957.png)

Two options:

- continue using `nbresuse==0.3.6` instead of `0.4.0`
- enable the deprecated `/metrics` endpoint with:

```bash
jupyter lab --ResourceUseDisplay.disable_legacy_endpoint=False
```
