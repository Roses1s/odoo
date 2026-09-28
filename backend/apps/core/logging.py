import logging
import re

INN_RE = re.compile(r"\b(\d{2})\d{4,6}(\d{4})\b")
PHONE_RE = re.compile(r"(\+?\d{1,2})\d{5,}(\d{2})")


def mask(text: str) -> str:
    text = INN_RE.sub(r"\1****\2", text)
    return PHONE_RE.sub(r"\1***\2", text)


class PIIMaskFilter(logging.Filter):
    """Keeps customer identifiers out of the log.

    Tracebacks are masked as well: an exception raised while saving a lead
    carries the same INN and phone number in its frames, and those used to
    reach the log untouched.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = mask(record.getMessage())
        record.args = ()

        if record.exc_info:
            formatted = logging.Formatter().formatException(record.exc_info)
            record.exc_text = mask(formatted)
            record.exc_info = None
        elif record.exc_text:
            record.exc_text = mask(record.exc_text)

        if record.stack_info:
            record.stack_info = mask(record.stack_info)
        return True
