from apps.notifications.models import Notification


def notify(recipient, title: str, body: str = "", link: str = "") -> Notification | None:
    if recipient is None:
        return None
    return Notification.objects.create(
        recipient=recipient, title=title, body=body, link=link
    )
