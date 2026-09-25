import logging
import re

INN_RE = re.compile(r"\b(\d{2})\d{4,6}(\d{4})\b")
PHONE_RE = re.compile(r"(\+?\d{1,2})\d{5,}(\d{2})")


class PIIMaskFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()
        msg = INN_RE.sub(r"\1****\2", msg)
        msg = PHONE_RE.sub(r"\1***\2", msg)
        record.msg = msg
        record.args = ()
        return True
