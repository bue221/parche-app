package payments

// Parche keeps 10% of the listed tickets plus Colombian IVA (19%) on that commission.
// The buyer pays Amount + Fee; the promoter keeps Amount when the seller is connected.
const (
	CommissionPercent = 10
	IVAPercent        = 19
)

// FeeSplit is the service surcharge. Amounts are COP pesos (Parche "cents").
type FeeSplit struct {
	Amount     int
	Commission int
	IVA        int
	Fee        int
	Charge     int
	Net        int
}

// SplitFee computes comisión 10% + IVA 19% sobre esa comisión, cobrada al comprador.
func SplitFee(amount int) FeeSplit {
	if amount < 0 {
		amount = 0
	}
	commission := roundPercent(amount, CommissionPercent)
	iva := roundPercent(commission, IVAPercent)
	fee := commission + iva
	return FeeSplit{
		Amount:     amount,
		Commission: commission,
		IVA:        iva,
		Fee:        fee,
		Charge:     amount + fee,
		Net:        amount,
	}
}

func roundPercent(amount, percent int) int {
	if amount <= 0 || percent <= 0 {
		return 0
	}
	return (amount*percent + 50) / 100
}
