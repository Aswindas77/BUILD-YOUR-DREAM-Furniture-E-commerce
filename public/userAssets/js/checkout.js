/**
 * Checkout page JavaScript
 */
document.addEventListener('DOMContentLoaded', function () {
    // Handle address selection
    const addressRadios = document.querySelectorAll('.address-radio');
    if (addressRadios) {
        addressRadios.forEach(radio => {
            radio.addEventListener('change', function () {
                const addressId = this.value;
                selectAddress(addressId);
            });
        });
    }

    // Handle form submission
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function (e) {
            e.preventDefault();
            processCheckout();
        });
    }

    // Handle add address form
    const addAddressForm = document.getElementById('add-address-form');
    if (addAddressForm) {
        addAddressForm.addEventListener('submit', function (e) {
            e.preventDefault();
            addNewAddress();
        });
    }
});

/**
 * Select an address for checkout
 * @param {string} addressId - The ID of the selected address
 */
function selectAddress(addressId) {
    fetch('/checkout/address/select', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ addressId })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update UI to show selected address
                const addressBoxes = document.querySelectorAll('.address-box');
                addressBoxes.forEach(box => {
                    box.classList.remove('selected');
                    if (box.dataset.addressId === addressId) {
                        box.classList.add('selected');
                    }
                });
            } else {
                showError(data.message);
            }
        })
        .catch(error => {
            console.error('Error selecting address:', error);
            showError('Failed to select address. Please try again.');
        });
}

/**
 * Process the checkout
 */
function processCheckout() {
    const selectedAddressRadio = document.querySelector('.address-radio:checked');
    if (!selectedAddressRadio) {
        showError('Please select a delivery address');
        return;
    }

    const selectedAddressId = selectedAddressRadio.value;
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    const cartId = document.getElementById('cartId').value;
    const couponCode = document.getElementById('couponCode') ? document.getElementById('couponCode').value : '';

    if (!paymentMethod) {
        showError('Please select a payment method');
        return;
    }

    const checkoutData = {
        selectedAddressId,
        paymentMethod,
        cartId,
        couponCode
    };

    fetch('/checkout/process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(checkoutData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (data.paypalRedirectUrl) {
                    // Redirect to PayPal
                    window.location.href = data.paypalRedirectUrl;
                } else {
                    // Redirect to order confirmation page
                    window.location.href = `/user/orderPlace?id=${data.orderId}`;
                }
            } else {
                showError(data.message);
            }
        })
        .catch(error => {
            console.error('Error processing checkout:', error);
            showError('Failed to process checkout. Please try again.');
        });
}

/**
 * Add a new address during checkout
 */
function addNewAddress() {
    const houseNumber = document.getElementById('houseNumber').value;
    const street = document.getElementById('street').value;
    const city = document.getElementById('city').value;
    const landmark = document.getElementById('landmark').value;
    const country = document.getElementById('country').value;
    const pincode = document.getElementById('pincode').value;
    const phone = document.getElementById('phone').value;

    if (!houseNumber || !city || !country || !pincode || !phone) {
        showError('Please fill all required fields');
        return;
    }

    const addressData = {
        houseNumber,
        street,
        city,
        landmark,
        country,
        pincode,
        phone
    };

    fetch('/checkout/address/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(addressData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Close the address modal
                const addressModal = document.getElementById('addressModal');
                if (addressModal) {
                    // If using Bootstrap modal
                    $('#addressModal').modal('hide');
                }

                // Reload page to show the new address
                window.location.reload();
            } else {
                showError(data.message);
            }
        })
        .catch(error => {
            console.error('Error adding address:', error);
            showError('Failed to add address. Please try again.');
        });
}

/**
 * Show error message to the user
 * @param {string} message - The error message to display
 */
function showError(message) {
    const errorDiv = document.getElementById('checkout-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';

        // Hide after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        // Fallback to alert if error div not found
        alert(message);
    }
}