import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import type { InvoiceDetail } from '../../types/subscription'
import { formatBillingAddress } from '../../utils/billingAddress'
import {
  formatDateTime,
  formatMoney,
  invoiceStatusColor,
} from '../../utils/planDisplay'

interface DetailFieldProps {
  label: string
  value: ReactNode
}

function DetailField({ label, value }: DetailFieldProps) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  )
}

interface InvoiceDetailViewProps {
  invoice: InvoiceDetail
}

export function InvoiceDetailView({ invoice }: InvoiceDetailViewProps) {
  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="h5">{invoice.invoiceNumber}</Typography>
            <Chip
              label={invoice.status}
              color={invoiceStatusColor(invoice.status)}
              size="small"
            />
          </Stack>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DetailField label="Invoice ID" value={invoice.id} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DetailField label="Subscription ID" value={invoice.subscriptionId ?? '—'} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DetailField label="Created" value={formatDateTime(invoice.createdAt)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DetailField label="Updated" value={formatDateTime(invoice.updatedAt)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DetailField
                label="Subtotal"
                value={formatMoney(invoice.currency, invoice.subTotal)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DetailField
                label="Grand total"
                value={formatMoney(invoice.currency, invoice.grandTotal)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DetailField
                label="Prorated difference"
                value={formatMoney(invoice.currency, invoice.proratedDifference)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <DetailField
                label="Billing address"
                value={formatBillingAddress(invoice.billingAddress)}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Line items
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Unit price</TableCell>
                  <TableCell align="right">Subtotal</TableCell>
                  <TableCell align="right">Attr. base</TableCell>
                  <TableCell>Reference</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoice.lineItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Typography variant="body2" color="text.secondary">
                        No line items on this invoice.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  invoice.lineItems.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>{item.lineItemName ?? '—'}</TableCell>
                      <TableCell>
                        <Chip label={item.lineItemCategory} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{item.lineItemType}</TableCell>
                      <TableCell align="right">{item.quantity ?? '—'}</TableCell>
                      <TableCell align="right">
                        {formatMoney(invoice.currency, item.unitPrice)}
                      </TableCell>
                      <TableCell align="right">
                        {formatMoney(invoice.currency, item.subTotal)}
                      </TableCell>
                      <TableCell align="right">
                        {formatMoney(invoice.currency, item.attributeBasePrice)}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {item.lineItemReference ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {invoice.receipt && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Receipt
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <DetailField label="Receipt ID" value={invoice.receipt.id} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <DetailField label="Payment method" value={invoice.receipt.paymentMethod} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <DetailField label="Gateway" value={invoice.receipt.paymentGateway ?? '—'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <DetailField label="Reference" value={invoice.receipt.paymentReference ?? '—'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <DetailField label="Card last 4" value={invoice.receipt.cardLast4Digit} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <DetailField label="Paid at" value={formatDateTime(invoice.receipt.createdAt)} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Stack>
  )
}
