from apps.core.fields import MaskedEmailField, MaskedINNField, MaskedPhoneField


def test_mask_email():
    assert MaskedEmailField().to_representation("logist@romashka.ru") == "l***@romashka.ru"


def test_mask_inn():
    assert MaskedINNField().to_representation("7707083893") == "77****3893"


def test_mask_phone():
    assert "***" in MaskedPhoneField().to_representation("+79991234567")
