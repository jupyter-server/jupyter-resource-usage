import six
from traitlets import TraitType

# copy-pasted from the master of Traitlets source


class Callable(TraitType):
    """A trait which is callable.
    Notes
    -----
    Classes are callable, as are instances
    with a __call__() method."""

    info_text = "a callable"

    def validate(self, obj, value):
        if six.callable(value):
            return value
        else:
            self.error(obj, value)
