# Changelog

## 0.4.0

- Soft-deprecate `/metrics` endpoint: [#68](https://github.com/yuvipanda/jupyter-resource-usage/pull/68)
- `nbresuse` now exposes a new endpoint: `/api/metrics/v1`: [#68](https://github.com/yuvipanda/jupyter-resource-usage/pull/68)

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

## 0.3.6

- Fix handling of cpu percent in the API endpoint [#56](https://github.com/yuvipanda/jupyter-resource-usage/pull/56)
- Added Binder  [#53](https://github.com/yuvipanda/jupyter-resource-usage/pull/53) & RELEASE.md [#54](https://github.com/yuvipanda/jupyter-resource-usage/pull/54)

## 0.3.5

- Adding support for jupyterlab statusbar-extension [#45](https://github.com/yuvipanda/jupyter-resource-usage/pull/45) [#36](https://github.com/yuvipanda/jupyter-resource-usage/issues/36)

## 0.3.4

- Autoformatting and documentation [#33](https://github.com/yuvipanda/jupyter-resource-usage/pull/33)
- Add section about CPU usage to the README [#30](https://github.com/yuvipanda/jupyter-resource-usage/pull/30)
- Make psutil optional dependency of NBResuse [#25](https://github.com/yuvipanda/jupyter-resource-usage/pull/25)
- Report the memory usage metrics as prometheus metrics [#22](https://github.com/yuvipanda/jupyter-resource-usage/pull/22)

## 0.3.3

- Made memory limit possibly dynamic via passing a callable in the config. [#23](https://github.com/yuvipanda/jupyter-resource-usage/pull/23)
- Track CPU usage [#21](https://github.com/yuvipanda/jupyter-resource-usage/pull/21)

## 0.3.2

- Require authentication for /metrics API Handler [#18](https://github.com/yuvipanda/jupyter-resource-usage/pull/18)

## 0.3.1

- Don't poll in background, since user does not see it [#15](https://github.com/yuvipanda/jupyter-resource-usage/pull/15)
- Poll instantly once page is foregrounded [#15](https://github.com/yuvipanda/jupyter-resource-usage/pull/15)

This should reduce the number of /metrics requests massively, with minimal interruption to user experience.

## 0.3.0

- Automatically install & enable extensions [#9](https://github.com/yuvipanda/jupyter-resource-usage/pull/9)
- Put nbextension / serverextension enables in different places
- Put nbresuse js files in appropriate path

## 0.2.0

- Change 'Mem' prefix in display to less cryptic 'Memory'
- Fix primary screenshot to show memory limit too
- Distribute static files via package_data
- Add screenshot for memory usage warning
- Configurable memory usage warnings

## 0.1.0

- Initial Commits for memory usage display
