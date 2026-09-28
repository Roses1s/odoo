from apps.core.fields import MaskedEmailField, MaskedINNField, MaskedPhoneField


def test_mask_email_keeps_only_the_first_letter():
    assert MaskedEmailField().to_representation("logist@romashka.ru") == "l***@romashka.ru"


def test_mask_inn_keeps_three_digits():
    masked = MaskedINNField().to_representation("7707083893")
    assert masked == "*******893"
    assert len(masked) == len("7707083893")


def test_mask_inn_handles_twelve_digits():
    assert MaskedINNField().to_representation("500100732259") == "*********259"


def test_mask_phone_keeps_country_code_and_two_digits():
    assert MaskedPhoneField().to_representation("+79991234567") == "+7********67"


def test_masks_leave_empty_and_short_values_alone():
    assert MaskedEmailField().to_representation("") == ""
    assert MaskedINNField().to_representation("123") == "123"
    assert MaskedPhoneField().to_representation("12345") == "12345"
