;; title: smart-claimant
;; summary: Can claim from timelocked wallet and disperse funds to multiple principals

;; public functions
(define-public (claim)
    (begin
        (try! (as-contract (contract-call? .timelocked-wallet claim)))
        (let
            (
                (total-balance (stx-get-balance (as-contract tx-sender)))
                (share (/ total-balance u4))
            )

            (try! (as-contract (stx-transfer? share tx-sender 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5)))
            (try! (as-contract (stx-transfer? share tx-sender 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG)))
            (try! (as-contract (stx-transfer? share tx-sender 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC)))
            (try! (as-contract (stx-transfer? (stx-get-balance tx-sender) tx-sender 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)))
            (ok true)
        )
    )
)
