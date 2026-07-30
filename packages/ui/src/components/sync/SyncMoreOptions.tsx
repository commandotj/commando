import React, { useState } from "react";
import { GearIcon } from "@radix-ui/react-icons";
import { Dialog, Flex, Text, Checkbox, Select } from "@radix-ui/themes";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
    setUseChecksum,
    setErrorMode,
    setDeleteMethod,
    setDeleteExtraneous,
    setDryRun,
    setResume,
} from "../../app/syncSlice";
import { saveSettings } from "../../services/settingsService";
import { useI18n } from "../../hooks/useI18n";

const SyncMoreOptions: React.FC = () => {
    const dispatch = useAppDispatch();
    const options = useAppSelector(s => s.sync.options);
    const [open, setOpen] = useState(false);
    const { t } = useI18n();

    const handleOpenChange = (v: boolean) => {
        setOpen(v);
        if (!v) saveSettings(options);
    };

    return (
        <Dialog.Root open={open} onOpenChange={handleOpenChange}>
            <Dialog.Trigger>
                <button
                    type="button"
                    className="sync-btn sync-btn--ghost"
                    title={t("sync.settings.title")}
                >
                    <GearIcon width={14} height={14} />
                </button>
            </Dialog.Trigger>
            <Dialog.Content>
                <Dialog.Title>{t("sync.settings.title")}</Dialog.Title>
                <Flex direction="column" gap="3" mt="3">
                    <Text size="2" weight="bold">
                        {t("sync.settings.comparison")}
                    </Text>
                    <Text as="label" size="2">
                        <Flex gap="2" align="center">
                            <Checkbox
                                checked={options.useChecksum}
                                onCheckedChange={v =>
                                    dispatch(setUseChecksum(!!v))
                                }
                            />
                            {t("sync.settings.contentCompare")}
                        </Flex>
                    </Text>

                    <Text size="2" weight="bold">
                        {t("sync.settings.syncMode")}
                    </Text>
                    <Text as="label" size="2">
                        <Flex gap="2" align="center">
                            <Checkbox
                                checked={options.deleteExtraneous}
                                onCheckedChange={v =>
                                    dispatch(setDeleteExtraneous(!!v))
                                }
                            />
                            {t("sync.settings.deleteExtraneous")}
                        </Flex>
                    </Text>
                    <Text as="label" size="2">
                        <Flex gap="2" align="center">
                            <Checkbox
                                checked={options.dryRun}
                                onCheckedChange={v => dispatch(setDryRun(!!v))}
                            />
                            {t("sync.settings.dryRun")}
                        </Flex>
                    </Text>
                    <Text as="label" size="2">
                        <Flex gap="2" align="center">
                            <Checkbox
                                checked={options.resume ?? false}
                                onCheckedChange={v => dispatch(setResume(!!v))}
                            />
                            {t("sync.settings.resume")}
                        </Flex>
                    </Text>

                    <Text size="2" weight="bold">
                        {t("sync.settings.errorHandling")}
                    </Text>
                    <Select.Root
                        value={options.errorMode ?? "ignore"}
                        onValueChange={v =>
                            dispatch(setErrorMode(v as "stop" | "ignore"))
                        }
                    >
                        <Select.Trigger />
                        <Select.Content>
                            <Select.Item value="ignore">
                                {t("sync.settings.continueOnError")}
                            </Select.Item>
                            <Select.Item value="stop">
                                {t("sync.settings.stopOnError")}
                            </Select.Item>
                        </Select.Content>
                    </Select.Root>

                    <Text size="2" weight="bold">
                        {t("sync.settings.deleteMethod")}
                    </Text>
                    <Select.Root
                        value={options.deleteMethod ?? "permanent"}
                        onValueChange={v =>
                            dispatch(
                                setDeleteMethod(
                                    v as "permanent" | "trash" | "versioning"
                                )
                            )
                        }
                    >
                        <Select.Trigger />
                        <Select.Content>
                            <Select.Item value="permanent">
                                {t("sync.settings.permanent")}
                            </Select.Item>
                            <Select.Item value="trash">
                                {t("sync.settings.trash")}
                            </Select.Item>
                            <Select.Item value="versioning">
                                {t("sync.settings.versioning")}
                            </Select.Item>
                        </Select.Content>
                    </Select.Root>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
};
export default SyncMoreOptions;
