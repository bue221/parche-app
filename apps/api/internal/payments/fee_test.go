package payments

import "testing"

func TestSplitFee(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name                              string
		amount                            int
		commission, iva, fee, charge, net int
	}{
		{name: "zero", amount: 0},
		{name: "fifty thousand", amount: 50000, commission: 5000, iva: 950, fee: 5950, charge: 55950, net: 50000},
		{name: "one hundred thousand", amount: 100000, commission: 10000, iva: 1900, fee: 11900, charge: 111900, net: 100000},
		{name: "one peso", amount: 1, charge: 1, net: 1},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := SplitFee(tc.amount)
			if got.Commission != tc.commission || got.IVA != tc.iva || got.Fee != tc.fee || got.Charge != tc.charge || got.Net != tc.net {
				t.Fatalf("%+v", got)
			}
		})
	}
}
