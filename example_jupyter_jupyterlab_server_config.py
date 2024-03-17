c = get_config()  # noqa
# resource monitor config
c.ResourceUseDisplay.track_cpu_percent = True
c.ResourceUseDisplay.cpu_limit = 4

c.ResourceUseDisplay.mem_limit = 8589934592  # 8GB

c.ResourceUseDisplay.track_disk_usage = True
c.ResourceUseDisplay.disk_path = "/home"
