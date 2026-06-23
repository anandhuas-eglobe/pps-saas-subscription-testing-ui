import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import type { CartPricingPreview } from '../../types/subscription'
import { formatMoney } from '../../utils/planDisplay'

function formatOptionalMoney(currency: string, value: number | null | undefined): string {
  if (value == null) return '—'
  return formatMoney(currency, value)
}

function PricingTotalRow({
  label,
  value,
  emphasize = false,
}: {
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
      <Typography color={emphasize ? 'text.primary' : 'text.secondary'} sx={{ fontWeight: emphasize ? 700 : 400 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: emphasize ? 700 : 400 }}>{value}</Typography>
    </Stack>
  )
}

interface CartPricingPreviewDetailsProps {
  pricing: CartPricingPreview
  title?: string
}

export function CartPricingPreviewDetails({
  pricing,
  title = 'Pricing breakdown',
}: CartPricingPreviewDetailsProps) {
  const { currency } = pricing
  const hasProration =
    pricing.proratedDifference != null || pricing.baseProratedDifference != null
  const hasTaxData = pricing.taxData != null

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>

      {pricing.lines.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No line items (trial or zero-amount cart).
        </Typography>
      ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Line item</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Reference</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Unit</TableCell>
                <TableCell align="right">Subtotal</TableCell>
                <TableCell align="right">Base subtotal</TableCell>
                <TableCell align="right">Attr. base</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pricing.lines.map((line, index) => (
                <TableRow key={`${line.lineItemReference ?? line.lineItemName}-${index}`}>
                  <TableCell sx={{ minWidth: 180 }}>
                    <Typography variant="body2">{line.lineItemName}</Typography>
                  </TableCell>
                  <TableCell>{line.lineItemCategory ?? '—'}</TableCell>
                  <TableCell>{line.lineItemType ?? '—'}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: 160 }}>
                    {line.lineItemReference ?? '—'}
                  </TableCell>
                  <TableCell align="right">{line.quantity ?? '—'}</TableCell>
                  <TableCell align="right">
                    {formatOptionalMoney(currency, line.unitPrice)}
                  </TableCell>
                  <TableCell align="right">
                    {formatMoney(currency, line.subTotal)}
                  </TableCell>
                  <TableCell align="right">
                    {formatOptionalMoney(currency, line.baseSubTotal)}
                  </TableCell>
                  <TableCell align="right">
                    {formatOptionalMoney(currency, line.attributeBasePrice)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Divider />

      <Stack spacing={0.75}>
        <PricingTotalRow
          label="Subtotal"
          value={formatMoney(currency, pricing.subtotal)}
        />
        {pricing.baseSubtotal != null && (
          <PricingTotalRow
            label="Base subtotal"
            value={formatMoney(currency, pricing.baseSubtotal)}
          />
        )}
        {hasProration && (
          <>
            <PricingTotalRow
              label="Prorated difference"
              value={formatOptionalMoney(currency, pricing.proratedDifference)}
            />
            <PricingTotalRow
              label="Base prorated difference"
              value={formatOptionalMoney(currency, pricing.baseProratedDifference)}
            />
          </>
        )}
        <PricingTotalRow
          label="Tax"
          value={formatMoney(currency, pricing.taxAmount)}
        />
        {pricing.baseTaxAmount != null && (
          <PricingTotalRow
            label="Base tax"
            value={formatMoney(currency, pricing.baseTaxAmount)}
          />
        )}
        <PricingTotalRow
          label="Grand total"
          value={formatMoney(currency, pricing.grandTotal)}
          emphasize
        />
        {pricing.baseGrandTotal != null && (
          <PricingTotalRow
            label="Base grand total"
            value={formatMoney(currency, pricing.baseGrandTotal)}
          />
        )}
        <PricingTotalRow label="Currency" value={currency} />
      </Stack>

      {hasTaxData && (
        <Accordion variant="outlined" disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">Tax data</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 1.5,
                borderRadius: 1,
                bgcolor: '#0f172a',
                color: '#e2e8f0',
                fontSize: '0.75rem',
                overflow: 'auto',
                maxHeight: 240,
              }}
            >
              {JSON.stringify(pricing.taxData, null, 2)}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}
    </Stack>
  )
}
