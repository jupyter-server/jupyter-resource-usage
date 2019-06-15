import pluggy

hookspec = pluggy.HookspecMarker("nbresuse")
hookimpl = pluggy.HookimplMarker("nbresuse")

@hookspec
def nbresuse_add_resource(config):
    """
    Return resource definitions to send to clients.

    Should return a dictionary that'll be merged with all other
    resources to be sent to the client.
    """

